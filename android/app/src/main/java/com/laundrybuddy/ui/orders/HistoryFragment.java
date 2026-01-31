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
        setupStatusFilterChips();
        setupDateFilterChips();
        setupSortButton();
        setupExportButton();
        setupSwipeRefresh();

        loadOrders();
    }

    private void setupRecyclerView() {
        orderAdapter = new OrderAdapter(filteredOrders, order -> {
            showQrCodeDialog(order);
        });

        // Set up rating click listener
        orderAdapter.setRateClickListener(order -> showRatingDialog(order));

        binding.ordersRecycler.setLayoutManager(new LinearLayoutManager(getContext()));
        binding.ordersRecycler.setAdapter(orderAdapter);
    }

    private void showRatingDialog(Order order) {
        View dialogView = LayoutInflater.from(requireContext())
                .inflate(R.layout.dialog_rating, null);

        // Get dialog views
        TextView orderNumberText = dialogView.findViewById(R.id.orderNumberText);
        RatingBar ratingBar = dialogView.findViewById(R.id.ratingBar);
        TextView ratingHint = dialogView.findViewById(R.id.ratingHint);
        TextInputEditText feedbackInput = dialogView.findViewById(R.id.feedbackInput);
        com.google.android.material.chip.Chip chipFast = dialogView.findViewById(R.id.chipFast);
        com.google.android.material.chip.Chip chipClean = dialogView.findViewById(R.id.chipClean);
        com.google.android.material.chip.Chip chipFriendly = dialogView.findViewById(R.id.chipFriendly);
        com.google.android.material.chip.Chip chipValue = dialogView.findViewById(R.id.chipValue);
        com.google.android.material.button.MaterialButton cancelButton = dialogView.findViewById(R.id.cancelButton);
        com.google.android.material.button.MaterialButton submitButton = dialogView.findViewById(R.id.submitButton);

        orderNumberText.setText("Order #" + order.getOrderNumber());

        // Rating hint updates based on rating
        String[] hints = { "Tap to rate", "Poor", "Fair", "Good", "Very Good", "Excellent" };
        ratingBar.setOnRatingBarChangeListener((bar, rating, fromUser) -> {
            int index = Math.min((int) rating, hints.length - 1);
            ratingHint.setText(hints[index]);
        });

        // Quick feedback chips append to feedback
        View.OnClickListener chipListener = v -> {
            com.google.android.material.chip.Chip chip = (com.google.android.material.chip.Chip) v;
            String current = feedbackInput.getText() != null ? feedbackInput.getText().toString() : "";
            String chipText = chip.getText().toString();
            if (!current.contains(chipText)) {
                if (!current.isEmpty() && !current.endsWith(". ") && !current.endsWith(".")) {
                    current += ". ";
                }
                feedbackInput.setText(current + chipText);
                feedbackInput.setSelection(feedbackInput.getText().length());
            }
        };
        chipFast.setOnClickListener(chipListener);
        chipClean.setOnClickListener(chipListener);
        chipFriendly.setOnClickListener(chipListener);
        chipValue.setOnClickListener(chipListener);

        AlertDialog dialog = new MaterialAlertDialogBuilder(requireContext())
                .setView(dialogView)
                .setCancelable(true)
                .create();

        cancelButton.setOnClickListener(v -> dialog.dismiss());

        submitButton.setOnClickListener(v -> {
            float rating = ratingBar.getRating();
            if (rating < 1) {
                ToastManager.showError(requireContext(), "Please select a rating");
                return;
            }

            String feedback = feedbackInput.getText() != null ? feedbackInput.getText().toString().trim() : "";
            submitRating(order, (int) rating, feedback, dialog);
        });

        dialog.show();
    }

    private void submitRating(Order order, int rating, String feedback, AlertDialog dialog) {
        Map<String, Object> body = new HashMap<>();
        body.put("rating", rating);
        body.put("feedback", feedback);

        ApiClient.getInstance().getOrderApi().rateOrder(order.getId(), body)
                .enqueue(new Callback<ApiResponse<Order>>() {
                    @Override
                    public void onResponse(Call<ApiResponse<Order>> call, Response<ApiResponse<Order>> response) {
                        dialog.dismiss();
                        if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                            ToastManager.showSuccess(requireContext(), "Thank you for your rating!");
                            // Update local order and refresh
                            order.setRating(rating);
                            order.setFeedback(feedback);
                            orderAdapter.notifyDataSetChanged();
                        } else {
                            ToastManager.showError(requireContext(), "Failed to submit rating");
                        }
                    }

                    @Override
                    public void onFailure(Call<ApiResponse<Order>> call, Throwable t) {
                        dialog.dismiss();
                        Log.e(TAG, "Rating submission failed", t);
                        ToastManager.showError(requireContext(), getString(R.string.error_network));
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

    private void setupStatusFilterChips() {
        binding.filterChipGroup.setOnCheckedStateChangeListener((group, checkedIds) -> {
            if (checkedIds.contains(R.id.chipAll)) {
                currentStatusFilter = "all";
            } else if (checkedIds.contains(R.id.chipPending)) {
                currentStatusFilter = "pending";
            } else if (checkedIds.contains(R.id.chipInProgress)) {
                currentStatusFilter = "inprogress";
            } else if (checkedIds.contains(R.id.chipReady)) {
                currentStatusFilter = "ready";
            } else if (checkedIds.contains(R.id.chipDelivered)) {
                currentStatusFilter = "delivered";
            }
            applyFilters();
        });
    }

    private void setupDateFilterChips() {
        binding.dateChipGroup.setOnCheckedStateChangeListener((group, checkedIds) -> {
            if (checkedIds.contains(R.id.chipDateAll)) {
                currentDateFilter = "all";
            } else if (checkedIds.contains(R.id.chipToday)) {
                currentDateFilter = "today";
            } else if (checkedIds.contains(R.id.chipThisWeek)) {
                currentDateFilter = "week";
            } else if (checkedIds.contains(R.id.chipThisMonth)) {
                currentDateFilter = "month";
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
        binding.resultsCount.setVisibility(View.GONE);

        String userId = com.laundrybuddy.LaundryBuddyApp.getInstance().getUserId();
        if (userId == null) {
            showEmptyState("Please login to view history");
            binding.loadingProgress.setVisibility(View.GONE);
            return;
        }

        repository.getMyOrders(userId).observe(getViewLifecycleOwner(), orders -> {
            binding.swipeRefresh.setRefreshing(false);
            binding.loadingProgress.setVisibility(View.GONE);

            if (orders != null && !orders.isEmpty()) {
                allOrders.clear();
                allOrders.addAll(orders);
                applyFilters();
            } else {
                // If API failed but we have no local data, repository might return empty list
                // or null
                // If network is on, repository tried to fetch.
                // If network off, we just show empty if db empty.
                if (allOrders.isEmpty()) {
                    showEmptyState("No orders yet");
                }
            }
        });

        // Trigger manual refresh via repository if needed, but repository.getMyOrders
        // calls refresh if network available.
        // If swipe refresh, force refresh
        binding.swipeRefresh.setOnRefreshListener(() -> repository.refreshMyOrders(userId));
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

        // Update UI
        updateResultsCount();

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

    private void updateResultsCount() {
        if (!allOrders.isEmpty()) {
            binding.resultsCount.setVisibility(View.VISIBLE);
            binding.resultsCount.setText(filteredOrders.size() + " of " + allOrders.size() + " orders");
        } else {
            binding.resultsCount.setVisibility(View.GONE);
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
        MaterialButton doneBtn = dialogView.findViewById(R.id.doneButton);

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
