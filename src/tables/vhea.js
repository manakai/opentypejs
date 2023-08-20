// The `vhea` table contains information for vertical layout.
// https://www.microsoft.com/typography/OTSPEC/vhea.htm

import parse from '../parse';
import table from '../table';

// Parse the vertical header `vhea` table
function parseVheaTable(data, start) {
    const vhea = {};
    const p = new parse.Parser(data, start);
    vhea.version = p.parseVersion();
    vhea.vertTypoAscender = p.parseShort();
    vhea.vertTypoDescender = p.parseShort();
    vhea.vertTypoLineGap = p.parseShort();
    vhea.advanceHeightMax = p.parseUShort();
    vhea.minTopSideBearing = p.parseShort();
    vhea.minBottomSideBearing = p.parseShort();
    vhea.yMaxExtent = p.parseShort();
    vhea.caretSlopeRise = p.parseShort();
    vhea.caretSlopeRun = p.parseShort();
    vhea.caretOffset = p.parseShort();
    p.relativeOffset += 8;
    vhea.metricDataFormat = p.parseShort();
    vhea.numberOfLongVerMetrics = p.parseUShort();
    return vhea;
}

function makeVheaTable(options) {
    return new table.Table('vhea', [
        {name: 'version', type: 'FIXED', value: 0x00011000 /* 0x00010000 */},
        {name: 'vertTypoAscender', type: 'FWORD', value: 0},
        {name: 'vertTypoDescender', type: 'FWORD', value: 0},
        {name: 'vertTypoLineGap', type: 'FWORD', value: 0},
        {name: 'advanceHeightMax', type: 'UFWORD', value: 0},
        {name: 'minTopSideBearing', type: 'FWORD', value: 0},
        {name: 'minBottomSideBearing', type: 'FWORD', value: 0},
        {name: 'yMaxExtent', type: 'FWORD', value: 0},
        {name: 'caretSlopeRise', type: 'SHORT', value: 1},
        {name: 'caretSlopeRun', type: 'SHORT', value: 0},
        {name: 'caretOffset', type: 'SHORT', value: 0},
        {name: 'reserved1', type: 'SHORT', value: 0},
        {name: 'reserved2', type: 'SHORT', value: 0},
        {name: 'reserved3', type: 'SHORT', value: 0},
        {name: 'reserved4', type: 'SHORT', value: 0},
        {name: 'metricDataFormat', type: 'SHORT', value: 0},
        {name: 'numberOfLongVerMetrics', type: 'USHORT', value: 0}
    ], options);
}

export default { parse: parseVheaTable, make: makeVheaTable };
