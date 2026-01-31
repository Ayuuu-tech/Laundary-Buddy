package com.laundrybuddy.utils;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.util.Log;

import androidx.core.content.FileProvider;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.laundrybuddy.models.Order;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/**
 * Utility class for exporting order data to CSV/JSON files
 */
public class ExportUtils {

    private static final String TAG = "ExportUtils";
    private static final String EXPORT_DIR = "exports";

    public interface ExportCallback {
        void onSuccess(File file);

        void onError(String message);
    }

    /**
     * Export orders to CSV format
     */
    public static void exportToCsv(Context context, List<Order> orders, ExportCallback callback) {
        try {
            File exportDir = new File(context.getCacheDir(), EXPORT_DIR);
            if (!exportDir.exists()) {
                exportDir.mkdirs();
            }

            String timestamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
            File csvFile = new File(exportDir, "orders_" + timestamp + ".csv");

            FileWriter writer = new FileWriter(csvFile);

            // Write CSV header
            writer.append(
                    "Order Number,Status,Total Items,Special Instructions,Created At,Estimated Delivery,Rating\n");

            // Write order data
            for (Order order : orders) {
                writer.append(escapeCSV(order.getOrderNumber())).append(",");
                writer.append(escapeCSV(order.getStatus())).append(",");
                writer.append(String.valueOf(order.getTotalItems())).append(",");
                writer.append(escapeCSV(order.getSpecialInstructions())).append(",");
                writer.append(escapeCSV(formatDate(order.getCreatedAt()))).append(",");
                writer.append(escapeCSV(formatDate(order.getEstimatedDelivery()))).append(",");
                writer.append(order.getRating() != null ? String.valueOf(order.getRating()) : "").append("\n");
            }

            writer.flush();
            writer.close();

            callback.onSuccess(csvFile);

        } catch (IOException e) {
            Log.e(TAG, "Error exporting CSV", e);
            callback.onError("Failed to export CSV: " + e.getMessage());
        }
    }

    /**
     * Export orders to JSON format
     */
    public static void exportToJson(Context context, List<Order> orders, ExportCallback callback) {
        try {
            File exportDir = new File(context.getCacheDir(), EXPORT_DIR);
            if (!exportDir.exists()) {
                exportDir.mkdirs();
            }

            String timestamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
            File jsonFile = new File(exportDir, "orders_" + timestamp + ".json");

            Gson gson = new GsonBuilder().setPrettyPrinting().create();
            String json = gson.toJson(orders);

            FileWriter writer = new FileWriter(jsonFile);
            writer.write(json);
            writer.flush();
            writer.close();

            callback.onSuccess(jsonFile);

        } catch (IOException e) {
            Log.e(TAG, "Error exporting JSON", e);
            callback.onError("Failed to export JSON: " + e.getMessage());
        }
    }

    /**
     * Share a file using Intent
     */
    public static void shareFile(Context context, File file, String mimeType) {
        Uri fileUri = FileProvider.getUriForFile(
                context,
                context.getPackageName() + ".fileprovider",
                file);

        Intent shareIntent = new Intent(Intent.ACTION_SEND);
        shareIntent.setType(mimeType);
        shareIntent.putExtra(Intent.EXTRA_STREAM, fileUri);
        shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

        context.startActivity(Intent.createChooser(shareIntent, "Share Export"));
    }

    /**
     * Share CSV file
     */
    public static void shareCsv(Context context, File file) {
        shareFile(context, file, "text/csv");
    }

    /**
     * Share JSON file
     */
    public static void shareJson(Context context, File file) {
        shareFile(context, file, "application/json");
    }

    private static String escapeCSV(String value) {
        if (value == null)
            return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            value = value.replace("\"", "\"\"");
            return "\"" + value + "\"";
        }
        return value;
    }

    private static String formatDate(String dateString) {
        if (dateString == null)
            return "";
        try {
            SimpleDateFormat inputFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault());
            Date date = inputFormat.parse(dateString);
            SimpleDateFormat outputFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault());
            return outputFormat.format(date);
        } catch (Exception e) {
            return dateString;
        }
    }
}
