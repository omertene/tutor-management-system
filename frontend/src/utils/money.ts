/* Shows an amount of shekels the way the whole site does: "₪1,200".
   One place to change if the currency or the number format ever changes. */
export function formatMoney(amount: number | string): string {
    const value = Number(amount);
    return `₪${Number.isFinite(value) ? value.toLocaleString("he-IL") : amount}`;
}
