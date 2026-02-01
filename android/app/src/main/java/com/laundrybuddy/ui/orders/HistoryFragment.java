package com.laundrybuddy.ui.orders;

import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.PopupMenu;
import android.widget.RatingBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.google.android.material.dialog.MaterialAlertDialogBuilder;
import com.google.android.material.textfield.TextInputEditText;
import com.laundrybuddy.R;
import com.laundrybuddy.api.ApiClient;
import com.laundrybuddy.databinding.FragmentHistoryBinding;
import com.laundrybuddy.models.ApiResponse;
import com.laundrybuddy.models.Order;
import com.laundrybuddy.models.User;
import com.laundrybuddy.utils.ToastManager;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import android.content.ContentValues;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Environment;
import android.provider.MediaStore;
import android.widget.ImageView;
import android.widget.TextView;
import com.google.android.material.button.MaterialButton;
import com.laundrybuddy.utils.QrCodeGenerator;
import com.laundrybuddy.LaundryBuddyApp;
import java.io.OutputStream;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

import com.laundrybuddy.utils.ExportUtils;

/**
 * Fragment showing order history with filtering, search, and sorting
 */
public class HistoryFragment extends Fragment {

    private static final String TAG = "HistoryFragment";

    private FragmentHistoryBinding binding;
    private OrderAdapter orderAdapter;
    private List<Order> allOrders = new ArrayList<>();
    private List<Order> filteredOrders = new ArrayList<>();

    // QR Code vars
    private Bitmap currentQrBitmap;
    private String currentOrderNumber;

    // Filter states
    private String currentStatusFilter = "all";
    private String currentDateFilter = "all";
    private String currentSearchQuery = "";
    private String currentSortMode = "date_desc"; // date_desc, date_asc, status

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
            @Nullable Bundle savedInstanceState) {
        binding = FragmentHistoryBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        setupRecyclerView();
        setupSearch();
        setupFilters(); // Replaces setupStatusFilterChips and setupDateFilterChips
        setupSortButton();
        setupExportButton();
        setupSwipeRefresh();

        loadOrders();
    }

    private void setupRecyclerView() {
        orderAdapter = new OrderAdapter(filteredOrders, order -> {
            showQrCodeDialog(order);
        });

        // Handle rating click
        orderAdapter.setRateClickListener(this::showRatingDialog);

        binding.ordersRecycler.setLayoutManager(new LinearLayoutManager(getContext()));
        binding.ordersRecycler.setAdapter(orderAdapter);
    }

    private void showRatingDialog(Order order) {
        android.app.AlertDialog.Builder builder = new android.app.AlertDialog.Builder(requireContext());
        View view = getLayoutInflater().inflate(R.layout.dialog_rate_order, null);
        builder.setView(view);

        android.app.AlertDialog dialog = builder.create();
        dialog.getWindow().setBackgroundDrawableResource(android.R.color.transparent);

        android.widget.RatingBar ratingBar = view.findViewById(R.id.ratingBar);
        com.google.android.material.textfield.TextInputEditText commentInput = view.findViewById(R.id.commentInput);
        View cancelButton = view.findViewById(R.id.cancelButton);
        View submitButton = view.findViewById(R.id.submitButton);

        cancelButton.setOnClickListener(v -> dialog.dismiss());

        submitButton.setOnClickListener(v -> {
            float rating = ratingBar.getRating();
            String comment = commentInput.getText().toString().trim();

            if (rating < 1) {
                Toast.makeText(getContext(), "Please select a rating", Toast.LENGTH_SHORT).show();
                return;
            }

            submitRating(order, (int) rating, comment, dialog);
        });

        dialog.show();
    }

    private void submitRating(Order order, int rating, String comment, android.app.AlertDialog dialog) {
        Map<String, Object> feedback = new HashMap<>();
        feedback.put("rating", rating);
        feedback.put("comment", comment);

        // Use ISO 8601 format for date
        java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
                java.util.Locale.US);
        sdf.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
        feedback.put("submittedAt", sdf.format(new java.util.Date()));

        Map<String, Object> body = new HashMap<>();
        body.put("feedback", feedback);

        binding.loadingProgress.setVisibility(View.VISIBLE);

        ApiClient.getInstance().getOrderApi().updateOrder(order.getId(), body)
                .enqueue(new Callback<ApiResponse<Order>>() {
                    @Override
                    public void onResponse(Call<ApiResponse<Order>> call, Response<ApiResponse<Order>> response) {
                        binding.loadingProgress.setVisibility(View.GONE);
                        Log.d("RateOrder", "Response Code: " + response.code());
                        if (response.isSuccessful() && response.body() != null) {
                            if (response.body().isSuccess()) {
                                Toast.makeText(getContext(), "Thank you for your feedback!", Toast.LENGTH_SHORT).show();
                                dialog.dismiss();
                                // Update local order and refresh
                                loadOrders();
                            } else {
                                Toast.makeText(getContext(), "Failed: " + response.body().getMessage(),
                                        Toast.LENGTH_SHORT).show();
                            }
                        } else {
                            try {
                                String errorBody = response.errorBody() != null ? response.errorBody().string()
                                        : "Unknown error";
                                Log.e("RateOrder", "Error Body: " + errorBody);
                                Toast.makeText(getContext(), "Failed to submit rating (Code " + response.code() + ")",
                                        Toast.LENGTH_SHORT).show();
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                        }
                    }

                    @Override
                    public void onFailure(Call<ApiResponse<Order>> call, Throwable t) {
                        binding.loadingProgress.setVisibility(View.GONE);
                        Log.e("RateOrder", "Network Error", t);
                        Toast.makeText(getContext(), "Network error: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                    }
                });
    }

    private void setupSearch() {
        binding.searchInput.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {
            }

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                currentSearchQuery = s.toString().trim().toLowerCase();
                applyFilters();
            }

            @Override
            public void afterTextChanged(Editable s) {
            }
        });
    }

    private void setupFilters() {
        binding.filterChipGroup.setOnCheckedStateChangeListener((group, checkedIds) -> {
            // Reset filters first
            currentStatusFilter = "all";
            currentDateFilter = "all";

            if (checkedIds.contains(R.id.chipAll)) {
                // Default
            } else if (checkedIds.contains(R.id.chipThisWeek)) {
                currentDateFilter = "week";
            } else if (checkedIds.contains(R.id.chipThisMonth)) {
                currentDateFilter = "month";
            } else if (checkedIds.contains(R.id.chipCompleted)) {
                currentStatusFilter = "delivered";
            } else if (checkedIds.contains(R.id.chipCancelled)) {
                currentStatusFilter = "cancelled";
            }

            applyFilters();
        });
    }

    private void setupSortButton() {
        binding.sortButton.setOnClickListener(v -> showSortMenu());
    }

    private void showSortMenu() {
        PopupMenu popup = new PopupMenu(requireContext(), binding.sortButton);
        popup.getMenu().add(0, 1, 0, "Newest First");
        popup.getMenu().add(0, 2, 1, "Oldest First");
        popup.getMenu().add(0, 3, 2, "By Status");

        popup.setOnMenuItemClickListener(item -> {
            switch (item.getItemId()) {
                case 1:
                    currentSortMode = "date_desc";
                    break;
                case 2:
                    currentSortMode = "date_asc";
                    break;
                case 3:
                    currentSortMode = "status";
                    break;
            }
            applyFilters();
            return true;
        });

        popup.show();
    }

    private void setupExportButton() {
        binding.exportButton.setOnClickListener(v -> showExportMenu());
    }

    private void showExportMenu() {
        if (filteredOrders.isEmpty()) {
            ToastManager.showWarning(requireContext(), "No orders to export");
            return;
        }

        PopupMenu popup = new PopupMenu(requireContext(), binding.exportButton);
        popup.getMenu().add(0, 1, 0, "Export as CSV");
        popup.getMenu().add(0, 2, 1, "Export as JSON");

        popup.setOnMenuItemClickListener(item -> {
            switch (item.getItemId()) {
                case 1:
                    exportToCsv();
                    break;
                case 2:
                    exportToJson();
                    break;
            }
            return true;
        });

        popup.show();
    }

    private void exportToCsv() {
        ToastManager.showInfo(requireContext(), "Generating CSV...");
        ExportUtils.exportToCsv(requireContext(), filteredOrders, new ExportUtils.ExportCallback() {
            @Override
            public void onSuccess(java.io.File file) {
                ToastManager.showSuccess(requireContext(), "Export ready!");
                ExportUtils.shareCsv(requireContext(), file);
            }

            @Override
            public void onError(String message) {
                ToastManager.showError(requireContext(), message);
            }
        });
    }

    private void exportToJson() {
        ToastManager.showInfo(requireContext(), "Generating JSON...");
        ExportUtils.exportToJson(requireContext(), filteredOrders, new ExportUtils.ExportCallback() {
            @Override
            public void onSuccess(java.io.File file) {
                ToastManager.showSuccess(requireContext(), "Export ready!");
                ExportUtils.shareJson(requireContext(), file);
            }

            @Override
            public void onError(String message) {
                ToastManager.showError(requireContext(), message);
            }
        });
    }

    private void setupSwipeRefresh() {
        binding.swipeRefresh.setColorSchemeResources(R.color.primary);
        binding.swipeRefresh.setOnRefreshListener(this::loadOrders);
    }

    private com.laundrybuddy.repositories.OrderRepository repository;

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        repository = new com.laundrybuddy.repositories.OrderRepository(requireContext());
    }

    private void loadOrders() {
        binding.loadingProgress.setVisibility(View.VISIBLE);
        binding.emptyState.setVisibility(View.GONE);

        String userId = com.laundrybuddy.LaundryBuddyApp.getInstance().getUserId();
        String token = com.laundrybuddy.LaundryBuddyApp.getInstance().getAuthToken();

        Log.d(TAG, "loadOrders - userId: " + userId + ", hasToken: " + (token != null));

        // If user ID exists, load orders directly
        if (userId != null && !userId.isEmpty()) {
            fetchOrders(userId);
            return;
        }

        // If no userId but we have a token, try to extract userId from JWT token
        if (token != null) {
            Log.d(TAG, "No userId but have token, extracting from JWT...");
            String extractedUserId = extractUserIdFromToken(token);
            if (extractedUserId != null) {
                Log.d(TAG, "Extracted userId from token: " + extractedUserId);
                // Save it for future use
                com.laundrybuddy.LaundryBuddyApp.getInstance().saveUserInfo(extractedUserId, "", "", "student");
                fetchOrders(extractedUserId);
                return;
            }

            // If extraction failed, try API call as last resort
            Log.d(TAG, "Could not extract from token, trying API...");
            fetchCurrentUserAndLoadOrders();
            return;
        }

        // No userId and no token - user needs to login
        showEmptyState("Please login to view history");
        binding.loadingProgress.setVisibility(View.GONE);
    }

    /**
     * Extract userId from JWT token payload
     */
    private String extractUserIdFromToken(String token) {
        if (token == null)
            return null;
        try {
            // JWT has 3 parts: header.payload.signature
            String[] parts = token.split("\\.");
            if (parts.length < 2)
                return null;

            // Decode payload (base64)
            String payload = new String(android.util.Base64.decode(parts[1], android.util.Base64.URL_SAFE));
            Log.d(TAG, "JWT payload: " + payload);

            // Parse JSON to extract id
            org.json.JSONObject json = new org.json.JSONObject(payload);
            if (json.has("id")) {
                return json.getString("id");
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to extract userId from token", e);
        }
        return null;
    }

    private void fetchCurrentUserAndLoadOrders() {
        ApiClient.getInstance().getAuthApi().getCurrentUser().enqueue(new Callback<ApiResponse<User>>() {
            @Override
            public void onResponse(Call<ApiResponse<User>> call, Response<ApiResponse<User>> response) {
                Log.d(TAG, "getCurrentUser response code: " + response.code());

                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    User user = response.body().getUser() != null ? response.body().getUser()
                            : response.body().getData();
                    if (user != null && user.getId() != null) {
                        Log.d(TAG, "Got user: " + user.getId());
                        // Save recovered user info
                        com.laundrybuddy.LaundryBuddyApp.getInstance().saveUserInfo(
                                user.getId(), user.getName(), user.getEmail(), user.getRole());
                        // Load orders with the userId
                        fetchOrders(user.getId());
                    } else {
                        Log.e(TAG, "User or userId is null in response");
                        showEmptyState("Could not load profile. Please try again.");
                        binding.loadingProgress.setVisibility(View.GONE);
                    }
                } else {
                    Log.e(TAG, "getCurrentUser failed: " + response.code());
                    // Don't logout - just show error
                    showEmptyState("Could not verify session. Please try again.");
                    binding.loadingProgress.setVisibility(View.GONE);
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<User>> call, Throwable t) {
                Log.e(TAG, "getCurrentUser network error", t);
                // Network error - don't logout, just show error
                showEmptyState("Network error. Please check connection.");
                binding.loadingProgress.setVisibility(View.GONE);
            }
        });
    }

    private void fetchOrders(String userId) {
        repository.getMyOrders(userId).observe(getViewLifecycleOwner(), orders -> {
            binding.swipeRefresh.setRefreshing(false);
            binding.loadingProgress.setVisibility(View.GONE);

            if (orders != null && !orders.isEmpty()) {
                allOrders.clear();
                allOrders.addAll(orders);
                // Ensure active orders are top? Or assume sorted.
                // Re-sort by date desc to be sure for header logic
                Collections.sort(allOrders, (o1, o2) -> compareOrderDates(o2.getCreatedAt(), o1.getCreatedAt()));

                applyFilters();
                updateLiveOrderHeader();
            } else {
                if (allOrders.isEmpty()) {
                    showEmptyState("No orders yet");
                    binding.liveStatusText.setText("None");
                }
            }
        });
    }

    private void applyFilters() {
        filteredOrders.clear();

        for (Order order : allOrders) {
            // Apply status filter
            if (!matchesStatusFilter(order))
                continue;

            // Apply date filter
            if (!matchesDateFilter(order))
                continue;

            // Apply search query
            if (!matchesSearch(order))
                continue;

            filteredOrders.add(order);
        }

        // Apply sorting
        sortOrders();

        orderAdapter.notifyDataSetChanged();

        // UI update
        // updateResultsCount(); // Removed in favor of Live Status Header which is
        // static per load

        if (filteredOrders.isEmpty()) {
            showEmptyState(getEmptyMessage());
        } else {
            binding.emptyState.setVisibility(View.GONE);
            binding.ordersRecycler.setVisibility(View.VISIBLE);
        }
    }

    private boolean matchesStatusFilter(Order order) {
        if ("all".equals(currentStatusFilter))
            return true;

        String status = order.getStatus();
        if (status == null)
            return false;

        switch (currentStatusFilter) {
            case "pending":
                return "pending".equalsIgnoreCase(status);
            case "inprogress":
                return isInProgress(status);
            case "ready":
                return "ready".equalsIgnoreCase(status);
            case "delivered":
                return "delivered".equalsIgnoreCase(status);
            default:
                return true;
        }
    }

    private boolean matchesDateFilter(Order order) {
        if ("all".equals(currentDateFilter))
            return true;

        String createdAt = order.getCreatedAt();
        if (createdAt == null)
            return false;

        try {
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault());
            Date orderDate = sdf.parse(createdAt);
            if (orderDate == null)
                return false;

            Calendar cal = Calendar.getInstance();
            Calendar orderCal = Calendar.getInstance();
            orderCal.setTime(orderDate);

            switch (currentDateFilter) {
                case "today":
                    return isSameDay(cal, orderCal);
                case "week":
                    return isWithinWeek(cal, orderCal);
                case "month":
                    return isSameMonth(cal, orderCal);
                default:
                    return true;
            }
        } catch (ParseException e) {
            return true;
        }
    }

    private boolean matchesSearch(Order order) {
        if (currentSearchQuery.isEmpty())
            return true;

        String orderNumber = order.getOrderNumber();
        String status = order.getStatus();

        return (orderNumber != null && orderNumber.toLowerCase().contains(currentSearchQuery)) ||
                (status != null && status.toLowerCase().contains(currentSearchQuery));
    }

    private void sortOrders() {
        switch (currentSortMode) {
            case "date_desc":
                Collections.sort(filteredOrders, (o1, o2) -> compareOrderDates(o2.getCreatedAt(), o1.getCreatedAt()));
                break;
            case "date_asc":
                Collections.sort(filteredOrders, (o1, o2) -> compareOrderDates(o1.getCreatedAt(), o2.getCreatedAt()));
                break;
            case "status":
                Collections.sort(filteredOrders, (o1, o2) -> {
                    int s1 = getStatusPriority(o1.getStatus());
                    int s2 = getStatusPriority(o2.getStatus());
                    return Integer.compare(s1, s2);
                });
                break;
        }
    }

    private int compareOrderDates(String date1, String date2) {
        if (date1 == null && date2 == null)
            return 0;
        if (date1 == null)
            return 1;
        if (date2 == null)
            return -1;
        return date1.compareTo(date2);
    }

    private int getStatusPriority(String status) {
        if (status == null)
            return 99;
        switch (status.toLowerCase()) {
            case "pending":
                return 1;
            case "received":
                return 2;
            case "washing":
                return 3;
            case "drying":
                return 4;
            case "folding":
                return 5;
            case "ready":
                return 6;
            case "delivered":
                return 7;
            case "cancelled":
                return 8;
            default:
                return 99;
        }
    }

    private int getStatusColor(String status) {
        if (status == null)
            return 0xFF757575;
        switch (status.toLowerCase()) {
            case "pending":
            case "submitted":
                return 0xFF2196F3;
            case "received":
            case "washing":
            case "drying":
            case "folding":
                return 0xFFE67E22;
            case "ready":
            case "ready for pickup":
            case "ready-for-pickup":
                return 0xFFF39C12;
            case "delivered":
            case "completed":
                return 0xFF27AE60;
            case "cancelled":
                return 0xFFE74C3C;
            default:
                return 0xFF2196F3;
        }
    }

    private boolean isSameDay(Calendar cal1, Calendar cal2) {
        return cal1.get(Calendar.YEAR) == cal2.get(Calendar.YEAR) &&
                cal1.get(Calendar.DAY_OF_YEAR) == cal2.get(Calendar.DAY_OF_YEAR);
    }

    private boolean isWithinWeek(Calendar now, Calendar order) {
        Calendar weekAgo = (Calendar) now.clone();
        weekAgo.add(Calendar.DAY_OF_YEAR, -7);
        return order.after(weekAgo) || isSameDay(now, order);
    }

    private boolean isSameMonth(Calendar cal1, Calendar cal2) {
        return cal1.get(Calendar.YEAR) == cal2.get(Calendar.YEAR) &&
                cal1.get(Calendar.MONTH) == cal2.get(Calendar.MONTH);
    }

    private boolean isInProgress(String status) {
        return "received".equalsIgnoreCase(status) ||
                "washing".equalsIgnoreCase(status) ||
                "drying".equalsIgnoreCase(status) ||
                "folding".equalsIgnoreCase(status);
    }

    private void updateLiveOrderHeader() {
        if (allOrders == null || allOrders.isEmpty()) {
            binding.liveStatusText.setText("None");
            return;
        }

        Order liveOrder = null;
        for (Order order : allOrders) {
            String status = order.getStatus();
            if (status != null &&
                    !"delivered".equalsIgnoreCase(status) &&
                    !"completed".equalsIgnoreCase(status) &&
                    !"cancelled".equalsIgnoreCase(status)) {
                liveOrder = order;
                break;
            }
        }

        if (liveOrder != null) {
            binding.liveStatusText.setText(liveOrder.getStatusDisplay());
            binding.liveStatusText.setTextColor(getStatusColor(liveOrder.getStatus()));
        } else {
            binding.liveStatusText.setText("All Completed");
            binding.liveStatusText.setTextColor(0xFF757575); // Grey
        }
    }

    private String getEmptyMessage() {
        if (!currentSearchQuery.isEmpty()) {
            return "No orders match \"" + currentSearchQuery + "\"";
        } else if (!"all".equals(currentStatusFilter) || !"all".equals(currentDateFilter)) {
            return "No orders match the selected filters";
        }
        return "No orders yet";
    }

    private void showEmptyState(String message) {
        binding.emptyState.setVisibility(View.VISIBLE);
        binding.ordersRecycler.setVisibility(View.GONE);
        binding.emptyStateText.setText(message);
    }

    private void showQrCodeDialog(Order order) {
        currentOrderNumber = order.getOrderNumber();
        String userName = LaundryBuddyApp.getInstance().getUserName();

        // Get total items
        int totalItems = order.getTotalItems();

        // Generate QR code content
        String qrContent = QrCodeGenerator.buildOrderQrContent(
                currentOrderNumber,
                userName != null ? userName : "User",
                "", // hostel room
                totalItems,
                order.getStatus());

        currentQrBitmap = QrCodeGenerator.generateQrCode(qrContent, 400);

        // Inflate dialog view
        View dialogView = LayoutInflater.from(requireContext()).inflate(R.layout.dialog_qr_code, null);

        TextView orderNumberText = dialogView.findViewById(R.id.orderNumberText);
        ImageView qrCodeImage = dialogView.findViewById(R.id.qrCodeImage);
        MaterialButton downloadBtn = dialogView.findViewById(R.id.downloadQrButton);
        MaterialButton shareBtn = dialogView.findViewById(R.id.shareQrButton);
        android.widget.ImageButton doneBtn = dialogView.findViewById(R.id.doneButton);

        orderNumberText.setText("Order #" + currentOrderNumber);
        if (currentQrBitmap != null) {
            qrCodeImage.setImageBitmap(currentQrBitmap);
        }

        AlertDialog dialog = new MaterialAlertDialogBuilder(requireContext())
                .setView(dialogView)
                .setCancelable(true)
                .create();

        downloadBtn.setOnClickListener(v -> saveQrCode());

        shareBtn.setOnClickListener(v -> {
            ToastManager.showInfo(requireContext(), "Share functionality coming soon");
        });

        doneBtn.setOnClickListener(v -> dialog.dismiss());

        dialog.show();
    }

    private void saveQrCode() {
        if (currentQrBitmap == null || currentOrderNumber == null) {
            ToastManager.showError(requireContext(), "No QR code to save");
            return;
        }

        try {
            ContentValues values = new ContentValues();
            values.put(MediaStore.Images.Media.DISPLAY_NAME, "LaundryBuddy_" + currentOrderNumber + ".png");
            values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
            values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/LaundryBuddy");

            Uri uri = requireContext().getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                    values);
            if (uri != null) {
                OutputStream outputStream = requireContext().getContentResolver().openOutputStream(uri);
                if (outputStream != null) {
                    currentQrBitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream);
                    outputStream.close();
                    ToastManager.showSuccess(requireContext(), "QR Code saved to gallery");
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to save QR code", e);
            ToastManager.showError(requireContext(), "Failed to save QR code");
        }
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
