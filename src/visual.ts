import './../style/visual.less';
import powerbi from 'powerbi-visuals-api';
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import DataView = powerbi.DataView;
import DataViewObjects = powerbi.DataViewObjects;
import DataViewMetadata = powerbi.DataViewMetadata;

// Formatting Options
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstanceEnumeration = powerbi.VisualObjectInstanceEnumeration;
import VisualObjectInstance = powerbi.VisualObjectInstance;

import { chain, groupBy, zip, flattenDepth, isEmpty } from 'lodash';
import * as echarts from 'echarts';

import { VisualSettings } from './settings';
import { getTooltip } from './components/tooltip';
import { getLegend } from './components/legend';
import { getAxisPointer } from './components/axis-pointer';
import {
    EnumObject,
    PanelOptions,
    XAxisOptions,
    SeriesOptions,
    panelEnum,
    xAxisEnum,
    seriesEnum,
} from './options.enum';
import { getDefaultOption, getPanel, getXAxis, getSeries } from './options.helper';
import { defaultFormat, formatter } from './components/formatter';

type Data = {
    id: string;
    group: any;
    key: string;
    value: number;
    panel: PanelOptions;
    xAxis: XAxisOptions;
    series: SeriesOptions;
    valueFormat: string;
};

type DataViewMetadataColumn = powerbi.DataViewMetadataColumn & {
    rolesIndex: {
        [key: string]: number[];
    };
};

const mapDataView = (dataView: DataView): Data[] => {
    const { columns, rows } = dataView.table;

    const groupRoleIndex = columns.findIndex((col) => col.roles.group === true);

    const dataFilter = (_: any, i: number) => i !== groupRoleIndex;

    const groupValues = rows
        .map((row) => row[groupRoleIndex])
        .map((row) => ({ group: row, type: columns[groupRoleIndex].type }));

    const dataObjects = dataView.metadata.columns
        .filter(dataFilter)
        .map(({ format, objects, rolesIndex }: DataViewMetadataColumn) => ({
            format,
            objects,
            rolesIndex: rolesIndex.measures[0],
        }));

    const dataValues = rows
        .map((row) => <number[]>row.filter(dataFilter))
        .map((row) => {
            return zip(
                columns
                    .filter(dataFilter)
                    .map((column) => [Object.keys(column.roles)[0], column.displayName]),
                row,
            ).map(([[id, key], value]) => ({ id, key, value }));
        });

    const matchedData = zip(groupValues, dataValues).map(([group, values]) =>
        zip(values, dataObjects).map(([value, { format, objects, rolesIndex }]) => ({
            ...value,
            group: group.group,
            groupType: group.type,
            rolesIndex,
            panel: getPanel(objects),
            xAxis: getXAxis(objects),
            series: getSeries(objects),
            valueFormat: format || defaultFormat,
        })),
    );

    return chain(matchedData)
        .flatten()
        .sortBy(({ rolesIndex }) => -rolesIndex)
        .value();
};

const buildOptions = (data: Data[], settings: VisualSettings, dateFormat: string) => {
    const grouper = '-';

    const groupData = (fn: (d: Data) => string | number) => groupBy(data, fn);

    const panelData = groupData(({ panel }) => panel.panel);
    const axisData = groupData(({ panel, xAxis }) => [panel.panel, xAxis.offset].join(grouper));
    const seriesData = groupData(({ panel, xAxis, key, valueFormat }) =>
        [panel.panel, xAxis.offset, key, valueFormat].join(grouper),
    );

    const panelWidths = ['width1', 'width2', 'width3', 'width4', 'width5']
        .map((w) => settings.staticPanel[w])
        .map((w) => (w ? w * 0.9 : 0));

    const grid = Object.entries(panelData).map(([id], i) => {
        const prev = panelWidths.slice(0, i).reduce((acc, cur) => acc + cur, 0);
        return {
            id,
            top: `${settings.legend.width}%`,
            left: `${prev + 5}%`,
            width: `${panelWidths[i] - 5}%`,
        };
    });

    const yAxis = Object.entries(panelData).map(([id], i) => {
        return {
            type: 'time',
            id,
            gridId: id,
            inverse: true,
            axisLine: { show: false },
            axisLabel: {
                show: i === 0 ? true : false,
                fontSize: settings.axis.fontSize,
            },
            axisTick: {
                show: i === 0 ? true : false,
            },
        };
    });

    const xAxis = Object.entries(axisData).map(([id, data]) => {
        const [panel, offset] = id.split(grouper);
        const { inverse, mmOverride, mmMin, mmMax } = data.reduce(
            (_, cur) => cur.xAxis,
            getDefaultOption(xAxisEnum),
        );
        const valueFormat = data.reduce((_, cur) => cur.valueFormat, '');

        return {
            type: 'value',
            gridId: panel,
            id: `${panel}-${offset}`,
            alignTicks: true,
            min: (value: { min: number }) => (mmOverride ? mmMin : value.min),
            max: (value: { max: number }) => (mmOverride ? mmMax : value.max),
            position: 'top',
            offset: parseInt(offset) * 20,
            inverse,
            axisLabel: {
                formatter: (value: number) => formatter(valueFormat).format(value),
                fontSize: settings.axis.fontSize,
            },
        };
    });

    const series = Object.entries(seriesData).map(([id, data]) => {
        const [panel, xAxis, key, _] = id.split(grouper);
        const style = data.reduce((_, cur) => cur.series, getDefaultOption(seriesEnum));

        const { color } = style.color.solid;

        return {
            type: 'line',
            symbol: settings.dataPoint.dataPoint ? 'emptyCircle' : 'none',
            name: `${panel} - ${key}`,
            yAxisId: panel,
            xAxisId: `${panel}-${xAxis}`,
            data: data.map(({ group, value }) => [value, group]),
            lineStyle: { color },
            itemStyle: { color },
            areaStyle: style.area ? { color, opacity: style.areaOpacity } : null,
        };
    });

    const valueFormatters = Object.entries(seriesData).map(([id]) =>
        formatter(id.split(grouper).slice(-1).pop()),
    );

    return {
        legend: getLegend(settings.legend),
        tooltip: getTooltip({ valueFormatters, ...settings.tooltip }),
        axisPointer: getAxisPointer(dateFormat),
        grid,
        xAxis,
        yAxis,
        series,
    };
};

export class Visual implements IVisual {
    private target: HTMLElement;
    private settings: VisualSettings;
    private metadata: DataViewMetadata;
    private dataView: DataView;
    private data: Data[];
    private chart: echarts.ECharts;

    constructor(options: VisualConstructorOptions) {
        this.target = options.element;
        this.chart = echarts.init(this.target, null, { renderer: 'svg' });
    }

    public update(options: VisualUpdateOptions) {
        this.settings = VisualSettings.parse(options && options.dataViews && options.dataViews[0]);

        this.dataView = options.dataViews[0];
        this.metadata = this.dataView.metadata;

        this.data = mapDataView(this.dataView);

        if (isEmpty(this.data)) {
            return;
        }

        const chartOptions = buildOptions(
            this.data,
            this.settings,
            this.dataView.metadata.columns[0].format,
        );

        console.log({ chartOptions });

        this.chart.resize();
        this.chart.setOption(chartOptions, true, true);
    }

    public enumerateObjectInstances(
        options: EnumerateVisualObjectInstancesOptions,
    ): VisualObjectInstanceEnumeration {
        const { objectName } = options;

        if (!this.settings || !this.data) {
            return [];
        }

        const pushObject = (properties: Record<string, any>) => [
            { objectName, properties, selector: null },
        ];

        const pushObjectEnum = <T>(
            displayName: EnumObject<T>,
            propertiesFn: (obj: DataViewObjects) => VisualObjectInstance['properties'],
        ) => {
            const dataWithObjects = zip(
                this.metadata.columns.slice(1),
                Object.entries(groupBy(this.data, ({ key }) => key)),
            );

            const objectEnums = dataWithObjects.map(([{ queryName, objects }, [key]]) => {
                const props = propertiesFn(objects);
                return Object.entries(props).map(([propsKey, propsValue]) => ({
                    objectName,
                    properties: { [propsKey]: propsValue },
                    displayName: `[${key}] ${displayName[propsKey].displayName}`,
                    selector: { metadata: queryName },
                }));
            });

            return flattenDepth(objectEnums, 1);
        };

        const { legend, axis, tooltip, dataPoint, staticPanel } = this.settings;

        switch (objectName) {
            case 'legend':
                return pushObject(legend);

            case 'axis':
                return pushObject(axis);

            case 'tooltip':
                return pushObject(tooltip);

            case 'dataPoint':
                return pushObject(dataPoint);

            case 'staticPanel':
                return pushObject(staticPanel);

            case 'panel':
                return pushObjectEnum(panelEnum, getPanel);

            case 'xAxis':
                return pushObjectEnum(xAxisEnum, getXAxis);

            case 'series':
                return pushObjectEnum(seriesEnum, getSeries);

            default:
                return [];
        }
    }
}
