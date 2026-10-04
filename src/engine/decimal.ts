/**
 * Big-number support. Resource amounts, rates, costs and defenses are Decimal;
 * counts (units owned, levels) and city populations stay plain numbers.
 */
import Decimal from "break_infinity.js";

export { Decimal };
export type DecimalSource = Decimal | number | string;

export function D(value: DecimalSource): Decimal {
    return value instanceof Decimal ? value : new Decimal(value);
}

export const ZERO = new Decimal(0);
export const ONE = new Decimal(1);

export function dmin(a: Decimal, b: Decimal): Decimal {
    return a.lt(b) ? a : b;
}

export function dmax(a: Decimal, b: Decimal): Decimal {
    return a.gt(b) ? a : b;
}
