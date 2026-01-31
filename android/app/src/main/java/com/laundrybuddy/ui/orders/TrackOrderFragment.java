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
    private TimelineAdapter timelineAdapter;
    private RecentOrderAdapter recentOrderAdapter;
    private List<TimelineAdapter.TimelineStep> timelineSteps = new ArrayList<>();
    private List<Order> recentOrders = new ArrayList<>();

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
        setupQrScanner();
        setupTimeline();
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

    private void setupQrScanner() {
        if (binding.scanButton != null) {
            binding.scanButton.setOnClickListener(v -> {
                Intent intent = new Intent(requireContext(), QrScannerActivity.class);
                scannerLauncher.launch(intent);
            });
        }
    }

    private void setupTimeline() {
        timelineAdapter = new TimelineAdapter(timelineSteps);
        binding.timelineRecycler.setLayoutManager(new LinearLayoutManager(getContext()));
        binding.timelineRecycler.setAdapter(timelineAdapter);
        binding.timelineRecycler.setNestedScrollingEnabled(false);
    }

    private void setupRecentOrders() {
        recentOrderAdapter = new RecentOrderAdapter(recentOrders, order -> {
            String orderNumber = order.getOrderNumber();
            if (orderNumber != null) {
                binding.searchInput.setText(orderNumber);
                searchOrder(orderNumber);
            }
        });
        binding.recentOrdersRecycler.setLayoutManager(
                new LinearLayoutManager(getContext(), LinearLayoutManager.HORIZONTAL, false));
        binding.recentOrdersRecycler.setAdapter(recentOrderAdapter);
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
                                    binding.recentSection.setVisibility(View.VISIBLE);
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
        binding.orderCard.setVisibility(View.GONE);
        binding.emptyState.setVisibility(View.GONE);

        ApiClient.getInstance().getTrackingApi().searchOrders(query)
                .enqueue(new Callback<ApiResponse<List<Tracking>>>() {
                    @Override
                    public void onResponse(Call<ApiResponse<List<Tracking>>> call,
                            Response<ApiResponse<List<Tracking>>> response) {
                        binding.loadingProgress.setVisibility(View.GONE);

                        if (response.isSuccessful() && response.body() != null) {
                            ApiResponse<List<Tracking>> apiResponse = response.body();
                            if (apiResponse.isSuccess() && apiResponse.getData() != null
                                    && !apiResponse.getData().isEmpty()) {
                                displayOrder(apiResponse.getData().get(0));
                            } else {
                                binding.emptyState.setVisibility(View.VISIBLE);
                                ToastManager.showWarning(requireContext(), "Order not found");
                            }
                        } else {
                            binding.emptyState.setVisibility(View.VISIBLE);
                            ToastManager.showWarning(requireContext(), "Order not found");
                        }
                    }

                    @Override
                    public void onFailure(Call<ApiResponse<List<Tracking>>> call, Throwable t) {
                        binding.loadingProgress.setVisibility(View.GONE);
                        binding.emptyState.setVisibility(View.VISIBLE);
                        Log.e(TAG, "Search failed", t);
                        ToastManager.showError(requireContext(), getString(R.string.error_network));
                    }
                });
    }

    private void displayOrder(Tracking tracking) {
        binding.orderCard.setVisibility(View.VISIBLE);
        binding.emptyState.setVisibility(View.GONE);

        // Order number
        binding.orderNumber.setText("#" + tracking.getOrderNumber());

        // Status
        String status = tracking.getStatus();
        binding.statusChip.setText(getStatusDisplay(status));
        binding.statusChip.setChipBackgroundColor(ColorStateList.valueOf(getStatusColor(status)));
        binding.statusChip.setTextColor(ContextCompat.getColor(requireContext(), R.color.text_on_primary));

        // Items count from status history
        int historyCount = tracking.getStatusHistory() != null ? tracking.getStatusHistory().size() : 0;
        binding.itemsCount.setText(historyCount + " updates");

        // Estimated delivery
        String delivery = tracking.getEstimatedDelivery();
        binding.estimatedDelivery.setText(delivery != null ? delivery : "TBD");

        // Build and display timeline
        buildTimeline(status);
    }

    private void buildTimeline(String currentStatus) {
        timelineSteps.clear();
        String currentLower = currentStatus != null ? currentStatus.toLowerCase() : "pending";
        int currentIndex = getStatusIndex(currentLower);
        String now = new SimpleDateFormat("MMM dd, HH:mm", Locale.getDefault()).format(new Date());

        for (int i = 0; i < STATUS_PROGRESSION.length; i++) {
            String status = STATUS_PROGRESSION[i];
            boolean isCompleted = i < currentIndex;
            boolean isCurrent = i == currentIndex;
            String time = "";

            if (isCompleted || isCurrent) {
                time = now; // In real app, would use actual timestamps
            }

            timelineSteps.add(new TimelineAdapter.TimelineStep(
                    status,
                    getStatusDisplay(status),
                    time,
                    isCompleted,
                    isCurrent));
        }

        timelineAdapter.notifyDataSetChanged();
    }

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
