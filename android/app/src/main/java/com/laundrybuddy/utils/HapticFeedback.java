package com.laundrybuddy.utils;

import android.content.Context;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;

/**
 * Utility class for haptic feedback throughout the app
 */
public class HapticFeedback {

    private static final int CLICK_DURATION = 10; // Light click
    private static final int SUCCESS_DURATION = 50; // Success vibration
    private static final int ERROR_DURATION = 100; // Error vibration
    private static final int SELECTION_DURATION = 5; // Very light selection

    /**
     * Light click haptic for button presses
     */
    public static void lightClick(Context context) {
        vibrate(context, CLICK_DURATION, VibrationEffect.EFFECT_CLICK);
    }

    /**
     * Success haptic for completed actions
     */
    public static void success(Context context) {
        vibrate(context, SUCCESS_DURATION, VibrationEffect.EFFECT_TICK);
    }

    /**
     * Error haptic for failed actions
     */
    public static void error(Context context) {
        vibrate(context, ERROR_DURATION, VibrationEffect.EFFECT_HEAVY_CLICK);
    }

    /**
     * Selection haptic for item selections (checkboxes, etc)
     */
    public static void selection(Context context) {
        vibrate(context, SELECTION_DURATION, VibrationEffect.EFFECT_CLICK);
    }

    /**
     * Double tap pattern for special actions
     */
    public static void doubleTap(Context context) {
        long[] pattern = { 0, 30, 50, 30 };
        vibratePattern(context, pattern);
    }

    private static void vibrate(Context context, int duration, int effect) {
        if (context == null)
            return;

        try {
            Vibrator vibrator;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager vibratorManager = (VibratorManager) context
                        .getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                vibrator = vibratorManager != null ? vibratorManager.getDefaultVibrator() : null;
            } else {
                vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            }

            if (vibrator != null && vibrator.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    vibrator.vibrate(VibrationEffect.createPredefined(effect));
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    vibrator.vibrate(duration);
                }
            }
        } catch (Exception ignored) {
            // Haptic not available
        }
    }

    private static void vibratePattern(Context context, long[] pattern) {
        if (context == null)
            return;

        try {
            Vibrator vibrator;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager vibratorManager = (VibratorManager) context
                        .getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                vibrator = vibratorManager != null ? vibratorManager.getDefaultVibrator() : null;
            } else {
                vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            }

            if (vibrator != null && vibrator.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
                } else {
                    vibrator.vibrate(pattern, -1);
                }
            }
        } catch (Exception ignored) {
            // Haptic not available
        }
    }
}
