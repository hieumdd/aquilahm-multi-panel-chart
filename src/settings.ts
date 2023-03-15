import { dataViewObjectsParser } from 'powerbi-visuals-utils-dataviewutils';
import DataViewObjectsParser = dataViewObjectsParser.DataViewObjectsParser;

export class LegendSettings {
    public fontSize: number = 12;
    public spacing: number = 10;
    public width: number = 20;
}

export class AxisSettings {
    public fontSize: number = 12;
}

export class TooltipSettings {
    public fontSize: number = 12;
    public opacity: number = 100;
    public panelGap: number = 64;
    public padding: number = 1;
}

export class DataPointSettings {
    public dataPoint: boolean = false;
}

export class StaticPanelSettings {
    public width1: number = 20;
    public width2: number = 20;
    public width3: number = 20;
    public width4: number = 20;
    public width5: number = 20;
}

export class VisualSettings extends DataViewObjectsParser {
    public legend: LegendSettings = new LegendSettings();
    public axis: AxisSettings = new AxisSettings();
    public tooltip: TooltipSettings = new TooltipSettings();
    public dataPoint: DataPointSettings = new DataPointSettings();
    public staticPanel: StaticPanelSettings = new StaticPanelSettings();
}
