package com.laundrybuddy.ui.orders;

import android.content.Intent;
import android.content.res.ColorStateList;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.EditorInfo;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import android.widget.TextView;
import android.widget.ImageView;
import com.google.android.material.button.MaterialButton;
import androidx.appcompat.app.AlertDialog;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;

import com.laundrybuddy.R;
import com.laundrybuddy.api.ApiClient;
import com.laundrybuddy.databinding.FragmentTrackOrderBinding;
import com.laundrybuddy.models.ApiResponse;
import com.laundrybuddy.models.Order;
import com.laundrybuddy.models.Tracking;
import com.laundrybuddy.ui.scanner.QrScannerActivity;
import com.laundrybuddy.utils.ToastManager;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * Fragment for tracking order status with visual timeline and recent
 * submissions
 */
public class TrackOrderFragment extends Fragment {

    private static final String TAG = "TrackOrderFragment";

    // Status progression order
    private static final String[] STATUS_PROGRESSION = {
            "pending", "received", "washing", "drying", "folding", "ready", "delivered"
    };

    private FragmentTrackOrderBinding binding;
    private RecentOrderAdapter recentOrderAdapter;
    private List<Order> recentOrders = new ArrayList<>();
    private Order selectedOrder = null; // Track selected order for QR display

    private final ActivityResultLauncher<Intent> scannerLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
                if (result.getResultCode() == QrScannerActivity.RESULT_SCANNED && result.getData() != null) {
                    String scannedContent = result.getData().getStringExtra(QrScannerActivity.EXTRA_SCANNED_CONTENT);
                    if (scannedContent != null) {
                        handleScannedContent(scannedContent);
                    }
                }
            });

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
            @Nullable Bundle savedInstanceState) {
        binding = FragmentTrackOrderBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        setupSearch();
        setupTrackButton();
        setupQrScanner();
        setupRecentOrders();
        loadRecentOrders();
    }

    private void setupSearch() {
        binding.searchInput.setOnEditorActionListener((v, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_SEARCH) {
                String query = binding.searchInput.getText().toString().trim();
                if (!TextUtils.isEmpty(query)) {
                    searchOrder(query);
                }
                return true;
            }
            return false;
        });

        binding.searchLayout.setEndIconOnClickListener(v -> {
            String query = binding.searchInput.getText().toString().trim();
            if (!TextUtils.isEmpty(query)) {
                searchOrder(query);
            }
        });
    }

    private void setupTrackButton() {
        if (binding.btnTrack != null) {
            binding.btnTrack.setOnClickListener(v -> {
                String query = binding.searchInput.getText().toString().trim();
                if (!TextUtils.isEmpty(query)) {
                    searchOrder(query);
                }
            });
        }
    }

    private void setupQrScanner() {
        if (binding.scanButton != null) {
            binding.scanButton.setOnClickListener(v -> {
                Intent intent = new Intent(requireContext(), QrScannerActivity.class);
                scannerLauncher.launch(intent);
            });
        }
    }

    // Timeline removed

    private void setupRecentOrders() {
        recentOrderAdapter = new RecentOrderAdapter(recentOrders, order -> {
            String orderNumber = order.getOrderNumber();
            if (orderNumber != null) {
                selectedOrder = order; // Track selected order
                String cleanOrdNum = orderNumber.trim();
                binding.searchInput.setText(cleanOrdNum);
                searchOrder(cleanOrdNum);
            }
        });
        binding.recentOrdersRecycler.setLayoutManager(
                new LinearLayoutManager(getContext()));
        binding.recentOrdersRecycler.setAdapter(recentOrderAdapter);

        // Setup Show My QR button for showing QR of first/selected order
        setupShowMyQrButton();
    }

    private void setupShowMyQrButton() {
        if (binding.btnShowQr != null) {
            binding.btnShowQr.setOnClickListener(v -> {
                // Show QR for selected order, or first recent order
                Order orderToShow = selectedOrder;
                if (orderToShow == null && !recentOrders.isEmpty()) {
                    orderToShow = recentOrders.get(0);
                }
                if (orderToShow != null) {
                    showQrDialog(orderToShow);
                } else {
                    ToastManager.showWarning(requireContext(), "No orders available");
                }
            });
        }
    }

    private void loadRecentOrders() {
        ApiClient.getInstance().getOrderApi().getMyOrders()
                .enqueue(new Callback<ApiResponse<List<Order>>>() {
                    @Override
                    public void onResponse(Call<ApiResponse<List<Order>>> call,
                            Response<ApiResponse<List<Order>>> response) {
                        if (response.isSuccessful() && response.body() != null) {
                            ApiResponse<List<Order>> apiResponse = response.body();
                            if (apiResponse.isSuccess() && apiResponse.getData() != null) {
                                recentOrders.clear();
                                // Show max 5 recent orders
                                List<Order> allOrders = apiResponse.getData();
                                int limit = Math.min(5, allOrders.size());
                                for (int i = 0; i < limit; i++) {
                                    recentOrders.add(allOrders.get(i));
                                }
                                recentOrderAdapter.notifyDataSetChanged();

                                if (!recentOrders.isEmpty()) {
                                    if (binding.submissionsHeader != null)
                                        binding.submissionsHeader.setVisibility(View.VISIBLE);
                                    if (binding.recentOrdersRecycler != null)
                                        binding.recentOrdersRecycler.setVisibility(View.VISIBLE);
                                }
                            }
                        }
                    }

                    @Override
                    public void onFailure(Call<ApiResponse<List<Order>>> call, Throwable t) {
                        Log.e(TAG, "Failed to load recent orders", t);
                    }
                });
    }

    private void handleScannedContent(String content) {
        try {
            JSONObject json = new JSONObject(content);
            String orderNumber = json.optString("t", "");
            if (!orderNumber.isEmpty()) {
                binding.searchInput.setText(orderNumber);
                searchOrder(orderNumber);
                return;
            }
        } catch (Exception e) {
            // Not JSON, treat as plain order number
        }

        binding.searchInput.setText(content);
        searchOrder(content);
    }

    private void searchOrder(String query) {
        binding.loadingProgress.setVisibility(View.VISIBLE);
        if (binding.orderDetailsLayout != null) {
            binding.orderDetailsLayout.setVisibility(View.GONE);
        }
        binding.emptyState.setVisibility(View.GONE);

        ApiClient.getInstance().getTrackingApi().getOrderByNumber(query)
                .enqueue(new Callback<ApiResponse<Tracking>>() {
                    @Override
                    public void onResponse(Call<ApiResponse<Tracking>> call,
                            Response<ApiResponse<Tracking>> response) {
                        binding.loadingProgress.setVisibility(View.GONE);

                        if (response.isSuccessful() && response.body() != null) {
                            ApiResponse<Tracking> apiResponse = response.body();
                            if (apiResponse.isSuccess() && apiResponse.getData() != null) {
                                displayOrder(apiResponse.getData());
                            } else {
                                // binding.emptyState.setVisibility(View.VISIBLE);
                                ToastManager.showWarning(requireContext(), "Order not found");
                            }
                        } else {
                            // binding.emptyState.setVisibility(View.VISIBLE);
                            ToastManager.showWarning(requireContext(), "Order not found");
                        }
                    }

                    @Override
                    public void onFailure(Call<ApiResponse<Tracking>> call, Throwable t) {
                        binding.loadingProgress.setVisibility(View.GONE);
                        // binding.emptyState.setVisibility(View.VISIBLE);
                        Log.e(TAG, "Search failed", t);
                        ToastManager.showError(requireContext(), getString(R.string.error_network));
                    }
                });
    }

    private void setupQrLogic(Tracking tracking) {
        if (binding.btnShowQr != null) {
            binding.btnShowQr.setOnClickListener(v -> {
                Order orderToUse = tracking.getOrder();
                if (orderToUse == null) {
                    // Fallback if order not populated
                    orderToUse = new Order();
                    orderToUse.setOrderNumber(tracking.getOrderNumber());
                    orderToUse.setTotalItems(0);
                }
                showQrDialog(orderToUse);
            });
        }
    }

    private void showQrDialog(Order order) {
        // Build QR dialog inline since QrCodeDialog class is not available
        String orderNumber = order.getOrderNumber();
        int totalItems = order.getTotalItems();
        String userName = com.laundrybuddy.LaundryBuddyApp.getInstance().getUserName();

        String qrContent = com.laundrybuddy.utils.QrCodeGenerator.buildOrderQrContent(
                orderNumber,
                userName != null ? userName : "User",
                "",
                totalItems,
                order.getStatus());

        android.graphics.Bitmap qrBitmap = com.laundrybuddy.utils.QrCodeGenerator.generateQrCode(qrContent, 400);

        View dialogView = getLayoutInflater().inflate(R.layout.dialog_qr_code, null);
        TextView orderNumberText = dialogView.findViewById(R.id.orderNumberText);
        ImageView qrCodeImage = dialogView.findViewById(R.id.qrCodeImage);
        android.widget.ImageButton doneBtn = dialogView.findViewById(R.id.doneButton);
        // We can hide download/share for now if not implemented here, or just stub them

        orderNumberText.setText("Order #" + orderNumber);
        if (qrBitmap != null) {
            qrCodeImage.setImageBitmap(qrBitmap);
        }

        AlertDialog dialog = new MaterialAlertDialogBuilder(requireContext())
                .setView(dialogView)
                .setCancelable(true)
                .create();

        doneBtn.setOnClickListener(v -> dialog.dismiss());
        dialog.show();
    }

    private void displayOrder(Tracking tracking) {
        if (binding.orderDetailsLayout != null) {
            binding.orderDetailsLayout.setVisibility(View.VISIBLE);
        }
        binding.emptyState.setVisibility(View.GONE);

        // 1. Status Headline
        String status = tracking.getStatus();
        String displayStatus = getStatusDisplay(status);
        String est = tracking.getEstimatedDelivery();
        if (est == null)
            est = "TBD";

        binding.statusHeadline.setText(displayStatus + " - Estimated Completion: " + est);

        // 2. Grey Card Details
        binding.detailOrderNumber.setText("ORD" + tracking.getOrderNumber()); // Match format

        // Items & Instructions from Nested Order
        Order order = tracking.getOrder();
        if (order == null && selectedOrder != null) {
            // Fallback to selected order if tracking has unpopulated order
            order = selectedOrder;
        }

        if (order != null) {
            binding.detailItems.setText(order.getTotalItems() + " items");
            binding.detailInstructions
                    .setText(order.getSpecialInstructions() != null ? order.getSpecialInstructions() : "None");
        } else {
            binding.detailItems.setText("Details unavailable");
            binding.detailInstructions.setText("None");
        }

        // Latest Update
        List<Tracking.StatusUpdate> history = tracking.getStatusHistory();
        if (history != null && !history.isEmpty()) {
            Tracking.StatusUpdate latest = history.get(history.size() - 1);
            binding.detailLastUpdate.setText(latest.getStatus() + " (" + latest.getTimestamp() + ")");
        } else {
            binding.detailLastUpdate.setText("No recent updates");
        }

        // 3. Progress Bar
        int progress = 0;
        if (status != null) {
            switch (status.toLowerCase()) {
                case "pending":
                    progress = 10;
                    break;
                case "received":
                    progress = 30;
                    break;
                case "washing":
                    progress = 50;
                    break;
                case "drying":
                    progress = 70;
                    break;
                case "folding":
                    progress = 90;
                    break;
                case "ready":
                    progress = 100;
                    break;
                case "delivered":
                    progress = 100;
                    break;
            }
        }
        binding.orderProgressBar.setProgress(progress);

        setupQrLogic(tracking);
        setupNotifyButton(tracking);

    }

    private void setupNotifyButton(Tracking tracking) {
        if (binding.btnNotify != null) {
            String status = tracking.getStatus();
            boolean isReady = "ready".equalsIgnoreCase(status) || "delivered".equalsIgnoreCase(status);

            if (isReady) {
                binding.btnNotify.setVisibility(View.GONE);
            } else {
                binding.btnNotify.setVisibility(View.VISIBLE);
                if (tracking.isNotifyWhenReady()) {
                    binding.btnNotify.setText("Notification Enabled");
                    binding.btnNotify.setEnabled(false);
                    binding.btnNotify.setAlpha(0.6f);
                } else {
                    binding.btnNotify.setText("Notify Me When Ready");
                    binding.btnNotify.setEnabled(true);
                    binding.btnNotify.setAlpha(1.0f);
                    binding.btnNotify.setOnClickListener(v -> toggleNotification(tracking.getOrderNumber()));
                }
            }
        }
    }

    private void toggleNotification(String orderNumber) {
        binding.loadingProgress.setVisibility(View.VISIBLE);
        ApiClient.getInstance().getTrackingApi().toggleNotify(orderNumber)
                .enqueue(new Callback<ApiResponse<Tracking>>() {
                    @Override
                    public void onResponse(Call<ApiResponse<Tracking>> call, Response<ApiResponse<Tracking>> response) {
                        binding.loadingProgress.setVisibility(View.GONE);
                        if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                            String message = response.body().getMessage();
                            ToastManager.showSuccess(requireContext(),
                                    message != null ? message : "Notification updated");
                            // Refresh display
                            if (response.body().getData() != null) {
                                displayOrder(response.body().getData());
                            }
                        } else {
                            ToastManager.showError(requireContext(), "Failed to update notification");
                        }
                    }

                    @Override
                    public void onFailure(Call<ApiResponse<Tracking>> call, Throwable t) {
                        binding.loadingProgress.setVisibility(View.GONE);
                        ToastManager.showError(requireContext(), getString(R.string.error_network));
                    }
                });
    }

    // Timeline logic removed

    private int getStatusIndex(String status) {
        for (int i = 0; i < STATUS_PROGRESSION.length; i++) {
            if (STATUS_PROGRESSION[i].equals(status)) {
                return i;
            }
        }
        return 0;
    }

    private String getStatusDisplay(String status) {
        if (status == null)
            return "Unknown";
        switch (status.toLowerCase()) {
            case "submitted":
                return "Submitted";
            case "pending":
                return "Pending";
            case "received":
                return "Received";
            case "washing":
                return "Washing";
            case "drying":
                return "Drying";
            case "folding":
                return "Folding";
            case "ready":
                return "Ready for Pickup";
            case "delivered":
                return "Delivered";
            case "cancelled":
                return "Cancelled";
            default:
                return status;
        }
    }

    private int getStatusColor(String status) {
        if (status == null)
            return ContextCompat.getColor(requireContext(), R.color.text_hint);
        switch (status.toLowerCase()) {
            case "pending":
                return ContextCompat.getColor(requireContext(), R.color.status_pending);
            case "received":
                return ContextCompat.getColor(requireContext(), R.color.status_received);
            case "washing":
                return ContextCompat.getColor(requireContext(), R.color.status_washing);
            case "drying":
                return ContextCompat.getColor(requireContext(), R.color.status_drying);
            case "folding":
                return ContextCompat.getColor(requireContext(), R.color.status_folding);
            case "ready":
                return ContextCompat.getColor(requireContext(), R.color.status_ready);
            case "delivered":
                return ContextCompat.getColor(requireContext(), R.color.status_delivered);
            case "cancelled":
                return ContextCompat.getColor(requireContext(), R.color.status_cancelled);
            default:
                return ContextCompat.getColor(requireContext(), R.color.text_hint);
        }
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
