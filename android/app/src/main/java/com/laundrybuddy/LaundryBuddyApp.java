package com.laundrybuddy;

import android.app.Application;
import android.content.Context;
import android.content.SharedPreferences;

import com.laundrybuddy.api.ApiClient;
import com.laundrybuddy.db.AppDatabase;
import com.laundrybuddy.utils.ThemeManager;

/**
 * Main Application class for Laundry Buddy
 * Initializes global components like API client and shared preferences
 */
public class LaundryBuddyApp extends Application {

    private static LaundryBuddyApp instance;
    private SharedPreferences sharedPreferences;
    private ThemeManager themeManager;
    private AppDatabase database;

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        sharedPreferences = getSharedPreferences("LaundryBuddyPrefs", Context.MODE_PRIVATE);

        // Initialize theme manager and apply saved theme
        themeManager = new ThemeManager(this);
        themeManager.applySavedTheme();

        // Initialize API client
        ApiClient.init(this);

        // Initialize Database
        database = AppDatabase.getDatabase(this);
    }

    public AppDatabase getDatabase() {
        return database;
    }

    public ThemeManager getThemeManager() {
        return themeManager;
    }

    public static LaundryBuddyApp getInstance() {
        return instance;
    }

    public SharedPreferences getPrefs() {
        return sharedPreferences;
    }

    // Convenience methods for auth token management
    public void saveAuthToken(String token) {
        android.util.Log.d("LaundryBuddyApp", "Saving Token: " + token);
        sharedPreferences.edit().putString("auth_token", token).commit(); // Use commit for sync write
    }

    public String getAuthToken() {
        String token = sharedPreferences.getString("auth_token", null);
        android.util.Log.d("LaundryBuddyApp", "Reading Token: " + token);
        return token;
    }

    public void clearAuth() {
        sharedPreferences.edit()
                .remove("auth_token")
                .remove("user_id")
                .remove("user_name")
                .remove("user_email")
                .remove("user_role")
                .remove("session_active") // Fix: Remove session_active
                .apply();
    }

    public void saveUserInfo(String userId, String name, String email, String role) {
        sharedPreferences.edit()
                .putString("user_id", userId)
                .putString("user_name", name)
                .putString("user_email", email)
                .putString("user_role", role)
                .apply();
    }

    public String getUserId() {
        return sharedPreferences.getString("user_id", null);
    }

    public String getUserName() {
        return sharedPreferences.getString("user_name", null);
    }

    public String getUserEmail() {
        return sharedPreferences.getString("user_email", null);
    }

    public String getUserRole() {
        return sharedPreferences.getString("user_role", "student");
    }

    public boolean isLoggedIn() {
        return getAuthToken() != null || sharedPreferences.getBoolean("session_active", false);
    }

    public void setSessionActive(boolean active) {
        sharedPreferences.edit().putBoolean("session_active", active).apply();
    }

    // Theme preference
    public boolean isDarkMode() {
        return sharedPreferences.getBoolean("dark_mode", false);
    }

    public void setDarkMode(boolean darkMode) {
        sharedPreferences.edit().putBoolean("dark_mode", darkMode).apply();
    }
}
