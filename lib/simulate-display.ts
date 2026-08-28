// lib/simulate-delay.ts
export function simulateDelay(ms = 400) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}