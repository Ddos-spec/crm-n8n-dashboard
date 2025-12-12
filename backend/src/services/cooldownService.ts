import { differenceInHours } from 'date-fns';

export const isCooldownActive = (cooldownUntil: Date | null): boolean => {
    if (!cooldownUntil) return false;
    return new Date() < new Date(cooldownUntil);
};

export const setCooldown = (date: Date = new Date()): Date => {
    const cooldown = new Date(date);
    cooldown.setHours(cooldown.getHours() + 24);
    return cooldown;
};
