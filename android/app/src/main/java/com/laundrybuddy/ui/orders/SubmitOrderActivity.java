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
import android.widget.ImageView;
import android.widget.TextView;

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
 * Shows QR code on successful submission
 */
public class SubmitOrderActivity extends AppCompatActivity {

    private static final String TAG = "SubmitOrderActivity";

    private ActivitySubmitOrderBinding binding;

    private int shirtsCount = 0;
    private int pantsCount = 0;
    private int towelsCount = 0;
    private int bedsheetsCount = 0;

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

        // Shirts
        binding.btnShirtsPlus.setOnClickListener(v -> {
            shirtsCount++;
            binding.shirtsCount.setText(String.valueOf(shirtsCount));
            updateTotalItems();
        });
        binding.btnShirtsMinus.setOnClickListener(v -> {
            if (shirtsCount > 0) {
                shirtsCount--;
                binding.shirtsCount.setText(String.valueOf(shirtsCount));
                updateTotalItems();
            }
        });

        // Pants
        binding.btnPantsPlus.setOnClickListener(v -> {
            pantsCount++;
            binding.pantsCount.setText(String.valueOf(pantsCount));
            updateTotalItems();
        });
        binding.btnPantsMinus.setOnClickListener(v -> {
            if (pantsCount > 0) {
                pantsCount--;
                binding.pantsCount.setText(String.valueOf(pantsCount));
                updateTotalItems();
            }
        });

        // Towels
        binding.btnTowelsPlus.setOnClickListener(v -> {
            towelsCount++;
            binding.towelsCount.setText(String.valueOf(towelsCount));
            updateTotalItems();
        });
        binding.btnTowelsMinus.setOnClickListener(v -> {
            if (towelsCount > 0) {
                towelsCount--;
                binding.towelsCount.setText(String.valueOf(towelsCount));
                updateTotalItems();
            }
        });

        // Bedsheets
        binding.btnBedsheetsPlus.setOnClickListener(v -> {
            bedsheetsCount++;
            binding.bedsheetsCount.setText(String.valueOf(bedsheetsCount));
            updateTotalItems();
        });
        binding.btnBedsheetsMinus.setOnClickListener(v -> {
            if (bedsheetsCount > 0) {
                bedsheetsCount--;
                binding.bedsheetsCount.setText(String.valueOf(bedsheetsCount));
                updateTotalItems();
            }
        });

        // Submit button
        binding.submitButton.setOnClickListener(v -> submitOrder());
    }

    private void updateTotalItems() {
        int total = shirtsCount + pantsCount + towelsCount + bedsheetsCount;
        binding.totalItems.setText(String.valueOf(total));
    }

    private void submitOrder() {
        int total = shirtsCount + pantsCount + towelsCount + bedsheetsCount;

        if (total == 0) {
            ToastManager.showWarning(this, "Please add at least one item");
            return;
        }

        setLoading(true);

        // Build items list
        List<Map<String, Object>> items = new ArrayList<>();

        if (shirtsCount > 0) {
            Map<String, Object> item = new HashMap<>();
            item.put("name", "Shirts");
            item.put("quantity", shirtsCount);
            item.put("category", "tops");
            items.add(item);
        }

        if (pantsCount > 0) {
            Map<String, Object> item = new HashMap<>();
            item.put("name", "Pants");
            item.put("quantity", pantsCount);
            item.put("category", "bottoms");
            items.add(item);
        }

        if (towelsCount > 0) {
            Map<String, Object> item = new HashMap<>();
            item.put("name", "Towels");
            item.put("quantity", towelsCount);
            item.put("category", "linens");
            items.add(item);
        }

        if (bedsheetsCount > 0) {
            Map<String, Object> item = new HashMap<>();
            item.put("name", "Bedsheets");
            item.put("quantity", bedsheetsCount);
            item.put("category", "linens");
            items.add(item);
        }

        // Build request body
        Map<String, Object> body = new HashMap<>();
        body.put("items", items);
        body.put("totalItems", total);

        // Add required fields
        body.put("serviceType", "Wash & Fold"); // Default service
        body.put("pickupDate", "Today");
        body.put("pickupTime", "Anytime");
        body.put("deliveryDate", "Tomorrow");
        body.put("totalAmount", total * 10); // Est calculation
        // Address/Phone should come from Profile, but backend might take them here too
        // if new.

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
                        Log.e(TAG, "API Error: " + error);
                        if (apiResponse.getError() != null)
                            Log.e(TAG, "API Error Details: " + apiResponse.getError());
                        ToastManager.showError(SubmitOrderActivity.this, error);
                    }
                } else {
                    String errorBody = "";
                    try {
                        if (response.errorBody() != null)
                            errorBody = response.errorBody().string();
                    } catch (Exception e) {
                    }
                    Log.e(TAG,
                            "Response Failed: " + response.code() + " " + response.message() + " Body: " + errorBody);
                    ToastManager.showError(SubmitOrderActivity.this, "Failed: " + response.code() + " " + errorBody); // Show
                                                                                                                      // code
                                                                                                                      // to
                                                                                                                      // user
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
        int totalItems = shirtsCount + pantsCount + towelsCount + bedsheetsCount;

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
        MaterialButton doneBtn = dialogView.findViewById(R.id.doneButton);

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
