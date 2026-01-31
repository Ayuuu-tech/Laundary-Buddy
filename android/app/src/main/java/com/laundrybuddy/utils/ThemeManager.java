package com.laundrybuddy.utils;

import android.content.Context;
import android.content.SharedPreferences;

import androidx.appcompat.app.AppCompatDelegate;

/**
 * Manages app theme (light/dark mode)
 */
public class ThemeManager {

    private static final String PREF_NAME = "theme_prefs";
    private static final String KEY_DARK_MODE = "dark_mode";

    public static final int MODE_LIGHT = 0;
    public static final int MODE_DARK = 1;
    public static final int MODE_SYSTEM = 2;

    private final SharedPreferences prefs;

    public ThemeManager(Context context) {
        prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
    }

    /**
     * Get current theme mode
     */
    public int getThemeMode() {
        return prefs.getInt(KEY_DARK_MODE, MODE_SYSTEM);
    }

    /**
     * Set theme mode and apply it
     */
    public void setThemeMode(int mode) {
        prefs.edit().putInt(KEY_DARK_MODE, mode).apply();
        applyTheme(mode);
    }

    /**
     * Check if dark mode is enabled
     */
    public boolean isDarkMode() {
        return getThemeMode() == MODE_DARK;
    }

    /**
     * Toggle between light and dark mode
     */
    public void toggleDarkMode() {
        int currentMode = getThemeMode();
        if (currentMode == MODE_DARK) {
            setThemeMode(MODE_LIGHT);
        } else {
            setThemeMode(MODE_DARK);
        }
    }

    /**
     * Apply theme based on mode
     */
    public void applyTheme(int mode) {
        switch (mode) {
            case MODE_LIGHT:
                AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO);
                break;
            case MODE_DARK:
                AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_YES);
                break;
            case MODE_SYSTEM:
            default:
                AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM);
                break;
        }
    }

    /**
     * Apply saved theme on app start
     */
    public void applySavedTheme() {
        applyTheme(getThemeMode());
    }
}
