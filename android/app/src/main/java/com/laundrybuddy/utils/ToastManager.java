package com.laundrybuddy.utils;

import android.content.Context;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import com.laundrybuddy.R;

/**
 * Custom toast notifications matching website style
 */
public class ToastManager {

    public static final int TYPE_SUCCESS = 0;
    public static final int TYPE_ERROR = 1;
    public static final int TYPE_INFO = 2;
    public static final int TYPE_WARNING = 3;

    /**
     * Show a success toast
     */
    public static void showSuccess(Context context, String message) {
        showToast(context, message, TYPE_SUCCESS);
    }

    /**
     * Show an error toast
     */
    public static void showError(Context context, String message) {
        showToast(context, message, TYPE_ERROR);
    }

    /**
     * Show an info toast
     */
    public static void showInfo(Context context, String message) {
        showToast(context, message, TYPE_INFO);
    }

    /**
     * Show a warning toast
     */
    public static void showWarning(Context context, String message) {
        showToast(context, message, TYPE_WARNING);
    }

    /**
     * Show custom toast with type
     */
    private static void showToast(Context context, String message, int type) {
        Toast toast = Toast.makeText(context, message, Toast.LENGTH_SHORT);
        toast.setGravity(Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL, 0, 100);

        // For API 30+, custom toast views are deprecated, so we use default toast with
        // message
        toast.setText(getPrefix(type) + message);
        toast.show();
    }

    private static String getPrefix(int type) {
        switch (type) {
            case TYPE_SUCCESS:
                return "✓ ";
            case TYPE_ERROR:
                return "✗ ";
            case TYPE_WARNING:
                return "⚠ ";
            case TYPE_INFO:
            default:
                return "ℹ ";
        }
    }

    /**
     * Simple toast shortcut
     */
    public static void show(Context context, String message) {
        Toast.makeText(context, message, Toast.LENGTH_SHORT).show();
    }

    /**
     * Long duration toast
     */
    public static void showLong(Context context, String message) {
        Toast.makeText(context, message, Toast.LENGTH_LONG).show();
    }
}
