export type PanelOptions = {
    panel: '1' | '2' | '3' | '4' | '5';
};

export type XAxisOptions = {
    offset: 0 | 1 | 2;
    inverse: boolean;
    mmOverride: boolean;
    mmMin: number;
    mmMax: number;
};

export type SeriesOptions = {
    color: { solid: { color: string } };
    area: boolean;
    areaOpacity: number;
};

export type EnumObject<T> = {
    [key in keyof T]: {
        displayName: string;
        default_: T[key];
    };
};

export const panelEnum: EnumObject<PanelOptions> = {
    panel: { displayName: 'Panel', default_: '1' },
};

export const xAxisEnum: EnumObject<XAxisOptions> = {
    offset: { displayName: 'Offset', default_: 0 },
    inverse: { displayName: 'Inverse', default_: false },
    mmOverride: { displayName: 'Min/Max Override', default_: false },
    mmMin: { displayName: 'Min', default_: 0 },
    mmMax: { displayName: 'Max', default_: 100 },
};

export const seriesEnum: EnumObject<SeriesOptions> = {
    color: { displayName: 'Color', default_: { solid: { color: '#333333' } } },
    area: { displayName: 'Area', default_: false },
    areaOpacity: { displayName: 'Area Opacity (%)', default_: 1 },
};
