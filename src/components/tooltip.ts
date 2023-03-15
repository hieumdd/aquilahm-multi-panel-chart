import { valueFormatter } from 'powerbi-visuals-utils-formattingutils';
import IValueFormatter = valueFormatter.IValueFormatter;

import { groupBy } from 'lodash';

import { TooltipSettings } from '../settings';

const getContrastColor = (bgColor: string) => {
    return parseInt(bgColor.replace('#', ''), 16) > 0xffffff / 2 ? '#333333' : '#ffffff';
};

type TooltipOptions = TooltipSettings & {
    valueFormatters: IValueFormatter[];
};

export const getTooltip = (options: TooltipOptions) => {
    const { valueFormatters, fontSize, opacity, panelGap, padding } = options;

    const formatter = (i: any) => {
        const tooltipEl = document.createElement('div');
        tooltipEl.className = 'tooltip';

        Object.values(groupBy(i, ({ axisIndex }) => axisIndex))
            .map((panel) => {
                return panel.map(({ seriesName, value, seriesIndex, color }: any) => {
                    const seriesEl = document.createElement('div');

                    seriesEl.className = 'tooltip-series';
                    seriesEl.style.backgroundColor = `${color}`;
                    seriesEl.style.color = getContrastColor(color);
                    seriesEl.style.opacity = `${opacity}%`;
                    seriesEl.style.padding = `${padding}px`;

                    const labelEl = document.createElement('p');

                    labelEl.innerHTML = `${seriesName}`;
                    labelEl.style.fontSize = `${fontSize}px`;

                    const valueEl = document.createElement('p');
                    
                    valueEl.innerHTML = `${valueFormatters[seriesIndex].format(value[0]) || '-'}`;
                    valueEl.style.fontSize = `${fontSize}px`;

                    [labelEl, valueEl].forEach((el) => seriesEl.appendChild(el));

                    return seriesEl;
                });
            })
            .map((seriesEls) => {
                const panelEl = document.createElement('div');
                panelEl.className = 'tooltip-panel';
                seriesEls.forEach((el) => panelEl.appendChild(el));
                return panelEl;
            })
            .forEach((el) => tooltipEl.appendChild(el));

        tooltipEl.style.gap = `${panelGap}px`;

        return tooltipEl;
    };

    return {
        trigger: 'axis',
        className: 'tooltip-container',
        backgroundColor: 'transparent',
        extraCssText: 'box-shadow: none; border: none',
        padding: 0,
        axisPointer: { type: 'cross' },
        // position: (pos: any) => ({ top: '5%', left: pos[0] }),
        formatter,
    };
};
