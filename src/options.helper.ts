import powerbi from 'powerbi-visuals-api';
import DataViewObjects = powerbi.DataViewObjects;
import { dataViewObjects } from 'powerbi-visuals-utils-dataviewutils';

import { EnumObject, panelEnum, xAxisEnum, seriesEnum } from './options.enum';

export const getDefaultOption = <T>(enumObject: EnumObject<T>): T => {
    const options = Object.entries<EnumObject<T>[keyof EnumObject<T>]>(enumObject).map(
        ([key, value]) => [key, value.default_],
    );

    return Object.fromEntries(options);
};

const getObjectEnumValues = <T extends { [key: string]: any }>(
    objectName: string,
    enumObject: EnumObject<T>,
) => {
    return (objects: DataViewObjects): T => {
        const defaultOptions = Object.entries(getDefaultOption(enumObject));

        const options = defaultOptions.map(([propertyName, default_]) => [
            propertyName,
            dataViewObjects.getValue(objects, { objectName, propertyName }) || default_,
        ]);

        return objects ? Object.fromEntries(options) : Object.fromEntries(defaultOptions);
    };
};

export const getPanel = getObjectEnumValues('panel', panelEnum);

export const getXAxis = getObjectEnumValues('xAxis', xAxisEnum);

export const getSeries = getObjectEnumValues('series', seriesEnum);
