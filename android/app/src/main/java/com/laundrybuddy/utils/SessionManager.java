package com.laundrybuddy.utils;

import android.app.Activity;
import android.app.Application;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.laundrybuddy.LaundryBuddyApp;
import com.laundrybuddy.ui.auth.LoginActivity;

/**
 * Manages user session and handles automatic logout after inactivity.
 * 
 * Usage:
 * 1. Initialize in Application.onCreate(): SessionManager.init(this)
 * 2. The manager automatically tracks activity lifecycle
 * 3. If user is inactive for SESSION_TIMEOUT_MS, they will be logged out
 */
public class SessionManager implements Application.ActivityLifecycleCallbacks {

    private static final String TAG = "SessionManager";

    // Session timeout duration (15 minutes = 15 * 60 * 1000 ms)
    private static final long SESSION_TIMEOUT_MS = 15 * 60 * 1000;

    // Check interval for timeout (1 minute)
    private static final long CHECK_INTERVAL_MS = 60 * 1000;

    private static SessionManager instance;
    private final LaundryBuddyApp app;
    private final Handler handler;
    private long lastActivityTime;
    private boolean isInForeground = false;
    private Activity currentActivity;

    private final Runnable timeoutChecker = new Runnable() {
        @Override
        public void run() {
            checkSessionTimeout();
            if (isInForeground) {
                handler.postDelayed(this, CHECK_INTERVAL_MS);
            }
        }
    };

    private SessionManager(LaundryBuddyApp app) {
        this.app = app;
        this.handler = new Handler(Looper.getMainLooper());
        this.lastActivityTime = System.currentTimeMillis();

        // Register lifecycle callbacks
        app.registerActivityLifecycleCallbacks(this);
    }

    public static void init(LaundryBuddyApp app) {
        if (instance == null) {
            instance = new SessionManager(app);
            Log.d(TAG, "SessionManager initialized with " + (SESSION_TIMEOUT_MS / 60000) + " min timeout");
        }
    }

    public static SessionManager getInstance() {
        return instance;
    }

    /**
     * Call this method whenever user interacts with the app
     * to reset the inactivity timer.
     */
    public void updateLastActivity() {
        lastActivityTime = System.currentTimeMillis();
        Log.d(TAG, "Activity updated at: " + lastActivityTime);
    }

    /**
     * Check if session has timed out and logout if necessary.
     */
    private void checkSessionTimeout() {
        if (!app.isLoggedIn()) {
            return; // Not logged in, nothing to check
        }

        long currentTime = System.currentTimeMillis();
        long elapsedTime = currentTime - lastActivityTime;

        if (elapsedTime >= SESSION_TIMEOUT_MS) {
            Log.d(TAG, "Session timeout! Elapsed: " + (elapsedTime / 1000) + "s");
            performAutoLogout();
        } else {
            long remainingTime = (SESSION_TIMEOUT_MS - elapsedTime) / 1000;
            Log.d(TAG, "Session active. Remaining: " + remainingTime + "s");
        }
    }

    /**
     * Perform automatic logout due to inactivity.
     */
    private void performAutoLogout() {
        Log.d(TAG, "Performing auto logout due to inactivity");

        // Clear auth data
        app.clearAuth();

        // Show toast notification
        if (currentActivity != null) {
            handler.post(() -> {
                ToastManager.showWarning(currentActivity,
                        "Session expired due to inactivity. Please login again.");

                // Navigate to login
                Intent intent = new Intent(currentActivity, LoginActivity.class);
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                currentActivity.startActivity(intent);
                currentActivity.finish();
            });
        }
    }

    /**
     * Get remaining session time in milliseconds.
     */
    public long getRemainingSessionTime() {
        long elapsed = System.currentTimeMillis() - lastActivityTime;
        return Math.max(0, SESSION_TIMEOUT_MS - elapsed);
    }

    /**
     * Check if session is about to expire (within 2 minutes).
     */
    public boolean isSessionAboutToExpire() {
        return getRemainingSessionTime() <= 2 * 60 * 1000;
    }

    // Activity Lifecycle Callbacks

    @Override
    public void onActivityCreated(@NonNull Activity activity, @Nullable Bundle savedInstanceState) {
        // Activity created
    }

    @Override
    public void onActivityStarted(@NonNull Activity activity) {
        // Activity started
    }

    @Override
    public void onActivityResumed(@NonNull Activity activity) {
        currentActivity = activity;
        isInForeground = true;

        // Skip session check for login/signup activities
        String activityName = activity.getClass().getSimpleName();
        if (activityName.contains("Login") || activityName.contains("Signup") ||
                activityName.contains("Reset") || activityName.contains("Terms") ||
                activityName.contains("Privacy")) {
            // Don't check session for auth-related activities
            updateLastActivity();
            return;
        }

        // Check if session expired while app was in background
        if (app.isLoggedIn()) {
            long elapsed = System.currentTimeMillis() - lastActivityTime;
            if (elapsed >= SESSION_TIMEOUT_MS) {
                Log.d(TAG, "Session expired while in background (" + (elapsed / 1000) + "s)");
                performAutoLogout();
                return;
            }
        }

        // Update activity time and start checking
        updateLastActivity();
        handler.removeCallbacks(timeoutChecker);
        handler.postDelayed(timeoutChecker, CHECK_INTERVAL_MS);
    }

    @Override
    public void onActivityPaused(@NonNull Activity activity) {
        isInForeground = false;
        // Save last activity time when going to background
        updateLastActivity();
    }

    @Override
    public void onActivityStopped(@NonNull Activity activity) {
        // Activity stopped
    }

    @Override
    public void onActivitySaveInstanceState(@NonNull Activity activity, @NonNull Bundle outState) {
        // Save instance state
    }

    @Override
    public void onActivityDestroyed(@NonNull Activity activity) {
        if (currentActivity == activity) {
            currentActivity = null;
        }
    }
}
