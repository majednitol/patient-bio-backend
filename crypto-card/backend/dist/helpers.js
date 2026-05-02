"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.truncateEthereumAddress = exports.isNumberWithinRange = exports.isDateWithinRange = void 0;
function isDateWithinRange(baseDate, compareDate, interval) {
    const lowerBound = interval * 0.9 * 24 * 3600 * 1000;
    const upperBound = interval * 1.1 * 24 * 3600 * 1000;
    const difference = compareDate.getTime() - baseDate.getTime();
    return difference >= lowerBound && difference <= upperBound;
}
exports.isDateWithinRange = isDateWithinRange;
function isNumberWithinRange(baseValue, compareValue) {
    const base = parseFloat(baseValue);
    const compare = parseFloat(compareValue);
    return compare >= 0.9 * base && compare <= 1.1 * base;
}
exports.isNumberWithinRange = isNumberWithinRange;
function truncateEthereumAddress(address) {
    const prefixLength = 4;
    const suffixLength = 4;
    if (address.length <= 2 + prefixLength + suffixLength) {
        return address;
    }
    const prefix = address.substr(0, 2 + prefixLength);
    const suffix = address.substr(-suffixLength);
    return `${prefix}...${suffix}`;
}
exports.truncateEthereumAddress = truncateEthereumAddress;
//# sourceMappingURL=helpers.js.map