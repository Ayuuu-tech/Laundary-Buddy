package com.laundrybuddy.ui.orders;

import android.content.ContentValues;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.button.MaterialButton;
import com.laundrybuddy.LaundryBuddyApp;
import com.laundrybuddy.R;
import com.laundrybuddy.api.ApiClient;
import com.laundrybuddy.databinding.ActivitySubmitOrderBinding;
import com.laundrybuddy.models.ApiResponse;
import com.laundrybuddy.models.Order;
import com.laundrybuddy.utils.QrCodeGenerator;
import com.laundrybuddy.utils.ToastManager;

import java.io.OutputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * Activity for submitting new laundry orders
 * Features dynamic item input list
 */
public class SubmitOrderActivity extends AppCompatActivity {

    private static final String TAG = "SubmitOrderActivity";

    private ActivitySubmitOrderBinding binding;

    // Dynamic list of items
    private List<Map<String, Object>> dynamicItems = new ArrayList<>();

    private Bitmap currentQrBitmap;
    private String currentOrderNumber;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivitySubmitOrderBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        setupClickListeners();
        updateTotalItems();
    }

    private void setupClickListeners() {
        // Back button
        binding.backButton.setOnClickListener(v -> finish());

        // Add Item Button
        binding.btnAddItem.setOnClickListener(v -> addItem());

        // Submit button
        binding.submitButton.setOnClickListener(v -> submitOrder());
    }

    private void addItem() {
        String name = binding.inputItemName.getText().toString().trim();
        String qtyStr = binding.inputItemQty.getText().toString().trim();

        if (name.isEmpty()) {
            binding.inputItemName.setError("Required");
            return;
        }

        if (qtyStr.isEmpty()) {
            binding.inputItemQty.setError("Required");
            return;
        }

        int qty = 0;
        try {
            qty = Integer.parseInt(qtyStr);
        } catch (NumberFormatException e) {
            binding.inputItemQty.setError("Invalid number");
            return;
        }

        if (qty <= 0) {
            binding.inputItemQty.setError("Qty must be > 0");
            return;
        }

        // Add to list
        Map<String, Object> item = new HashMap<>();
        item.put("name", name);
        item.put("quantity", qty);
        item.put("category", "micellaneous"); // Default category

        dynamicItems.add(item);

        // Add View
        addItemView(item);

        // Clear input
        binding.inputItemName.setText("");
        binding.inputItemQty.setText("1");
        binding.inputItemName.requestFocus();

        updateTotalItems();
    }

    private void addItemView(Map<String, Object> item) {
        String name = (String) item.get("name");
        int quantity = (int) item.get("quantity");

        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(android.view.Gravity.CENTER_VERTICAL);
        row.setPadding(0, 16, 0, 16);

        TextView text = new TextView(this);
        text.setText(name + " (" + quantity + ")");
        text.setTextSize(16);
        text.setTextColor(getResources().getColor(R.color.text_primary));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1);
        text.setLayoutParams(params);

        com.google.android.material.button.MaterialButton deleteBtn = new com.google.android.material.button.MaterialButton(
                this);
        // Simplified delete button
        deleteBtn.setText("Remove");
        deleteBtn.setTextSize(12);
        deleteBtn.setPadding(0, 0, 0, 0);
        // Ideally use icon, but text is safer without complicated styles

        deleteBtn.setOnClickListener(v -> {
            dynamicItems.remove(item);
            binding.addedItemsContainer.removeView(row);
            updateTotalItems();
            if (dynamicItems.isEmpty())
                binding.emptyListText.setVisibility(View.VISIBLE);
        });

        row.addView(text);
        row.addView(deleteBtn);

        binding.addedItemsContainer.addView(row);
        binding.emptyListText.setVisibility(View.GONE);
    }

    private void updateTotalItems() {
        int total = 0;
        for (Map<String, Object> item : dynamicItems) {
            total += (int) item.get("quantity");
        }
        binding.totalItems.setText(String.valueOf(total));
    }

    private void submitOrder() {
        int total = 0;
        for (Map<String, Object> item : dynamicItems) {
            total += (int) item.get("quantity");
        }

        if (total == 0 || dynamicItems.isEmpty()) {
            ToastManager.showWarning(this, "Please add at least one item");
            return;
        }

        setLoading(true);

        // Build request body
        Map<String, Object> body = new HashMap<>();
        body.put("items", dynamicItems);
        body.put("totalItems", total);

        // Add required fields
        body.put("serviceType", "Wash & Fold"); // Default service
        // Format dates as ISO8601 (yyyy-MM-dd)
        java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US);
        java.util.Calendar calendar = java.util.Calendar.getInstance();
        String today = sdf.format(calendar.getTime());

        calendar.add(java.util.Calendar.DAY_OF_YEAR, 1);
        String tomorrow = sdf.format(calendar.getTime());

        body.put("pickupDate", today);
        body.put("pickupTime", "Anytime");
        body.put("deliveryDate", tomorrow);
        body.put("totalAmount", total * 10);

        String instructions = binding.instructionsInput.getText().toString().trim();
        if (!instructions.isEmpty()) {
            body.put("specialInstructions", instructions);
        }

        ApiClient.getInstance().getOrderApi().createOrder(body).enqueue(new Callback<ApiResponse<Order>>() {
            @Override
            public void onResponse(Call<ApiResponse<Order>> call, Response<ApiResponse<Order>> response) {
                setLoading(false);

                if (response.isSuccessful() && response.body() != null) {
                    ApiResponse<Order> apiResponse = response.body();
                    if (apiResponse.isSuccess() && apiResponse.getData() != null) {
                        Order order = apiResponse.getData();
                        showQrCodeDialog(order);
                    } else {
                        String error = apiResponse.getMessage() != null ? apiResponse.getMessage()
                                : "Failed to submit order";
                        ToastManager.showError(SubmitOrderActivity.this, error);
                    }
                } else {
                    String errorBody = "";
                    try {
                        if (response.errorBody() != null)
                            errorBody = response.errorBody().string();
                    } catch (Exception e) {
                    }
                    ToastManager.showError(SubmitOrderActivity.this, "Failed: " + response.code());
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<Order>> call, Throwable t) {
                setLoading(false);
                Log.e(TAG, "Network Failed", t);
                ToastManager.showError(SubmitOrderActivity.this, "Network Error: " + t.getMessage());
            }
        });
    }

    private void showQrCodeDialog(Order order) {
        currentOrderNumber = order.getOrderNumber();
        String userName = LaundryBuddyApp.getInstance().getUserName();
        // Recalculate total for QR
        int totalItems = 0;
        for (Map<String, Object> item : dynamicItems) {
            totalItems += (int) item.get("quantity");
        }

        // Generate QR code content
        String qrContent = QrCodeGenerator.buildOrderQrContent(
                currentOrderNumber,
                userName != null ? userName : "User",
                "", // hostel room
                totalItems,
                order.getStatus());

        currentQrBitmap = QrCodeGenerator.generateQrCode(qrContent, 400);

        // Inflate dialog view
        View dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_qr_code, null);

        TextView orderNumberText = dialogView.findViewById(R.id.orderNumberText);
        ImageView qrCodeImage = dialogView.findViewById(R.id.qrCodeImage);
        MaterialButton downloadBtn = dialogView.findViewById(R.id.downloadQrButton);
        MaterialButton shareBtn = dialogView.findViewById(R.id.shareQrButton);
        View doneBtn = dialogView.findViewById(R.id.doneButton);

        orderNumberText.setText("Order #" + currentOrderNumber);
        if (currentQrBitmap != null) {
            qrCodeImage.setImageBitmap(currentQrBitmap);
        }

        AlertDialog dialog = new AlertDialog.Builder(this)
                .setView(dialogView)
                .setCancelable(false)
                .create();

        downloadBtn.setOnClickListener(v -> saveQrCode());

        shareBtn.setOnClickListener(v -> {
            ToastManager.showInfo(this, "Share functionality coming soon");
        });

        doneBtn.setOnClickListener(v -> {
            dialog.dismiss();
            ToastManager.showSuccess(this, "Order submitted successfully!");
            finish();
        });

        dialog.show();
    }

    private void saveQrCode() {
        if (currentQrBitmap == null || currentOrderNumber == null) {
            ToastManager.showError(this, "No QR code to save");
            return;
        }

        try {
            ContentValues values = new ContentValues();
            values.put(MediaStore.Images.Media.DISPLAY_NAME, "LaundryBuddy_" + currentOrderNumber + ".png");
            values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
            values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/LaundryBuddy");

            Uri uri = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
            if (uri != null) {
                OutputStream outputStream = getContentResolver().openOutputStream(uri);
                if (outputStream != null) {
                    currentQrBitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream);
                    outputStream.close();
                    ToastManager.showSuccess(this, "QR Code saved to gallery");
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to save QR code", e);
            ToastManager.showError(this, "Failed to save QR code");
        }
    }

    private void setLoading(boolean loading) {
        binding.loadingProgress.setVisibility(loading ? View.VISIBLE : View.GONE);
        binding.submitButton.setEnabled(!loading);
    }
}
