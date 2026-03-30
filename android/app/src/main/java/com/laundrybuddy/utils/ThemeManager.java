package com.laundrybuddy.utils;

import android.content.Context;

import androidx.appcompat.app.AppCompatDelegate;

/**
 * Manages app theme - forces light mode only.
 */
public class ThemeManager {

    public static final int MODE_LIGHT = 0;
    public static final int MODE_DARK = 1;
    public static final int MODE_SYSTEM = 2;

    public ThemeManager(Context context) {
        // No-op: light mode is always used
    }

    public int getThemeMode() {
        return MODE_LIGHT;
    }

    public void setThemeMode(int mode) {
        // No-op: always light mode
        applyTheme(MODE_LIGHT);
    }

    public boolean isDarkMode() {
        return false;
    }

    public void toggleDarkMode() {
        // No-op: dark mode removed
    }

    public void applyTheme(int mode) {
        AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO);
    }

    public void applySavedTheme() {
        AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO);
    }
}
