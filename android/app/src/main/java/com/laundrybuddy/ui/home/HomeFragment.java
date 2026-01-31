package com.laundrybuddy.ui.home;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.laundrybuddy.LaundryBuddyApp;
import com.laundrybuddy.R;
import com.laundrybuddy.api.ApiClient;
import com.laundrybuddy.databinding.FragmentHomeBinding;
import com.laundrybuddy.models.ApiResponse;
import com.laundrybuddy.models.Order;
import com.laundrybuddy.ui.orders.OrderAdapter;
import com.laundrybuddy.ui.orders.SubmitOrderActivity;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * Home Fragment showing welcome message and recent orders
 */
public class HomeFragment extends Fragment {

    private static final String TAG = "HomeFragment";

    private FragmentHomeBinding binding;
    private LaundryBuddyApp app;
    private OrderAdapter orderAdapter;
    private List<Order> recentOrders = new ArrayList<>();

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
            @Nullable Bundle savedInstanceState) {
        binding = FragmentHomeBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        app = LaundryBuddyApp.getInstance();

        setupUserInfo();
        setupRecyclerView();
        setupClickListeners();
        setupSwipeRefresh();

        loadRecentOrders();
    }

    private void setupUserInfo() {
        String userName = app.getUserName();
        String userEmail = app.getUserEmail();

        binding.userName.setText(userName != null ? userName : "User");
        binding.userEmail.setText(userEmail != null ? userEmail : "");
    }

    private void setupRecyclerView() {
        orderAdapter = new OrderAdapter(recentOrders, order -> {
            // Handle order click - navigate to track
            Toast.makeText(getContext(), "Order: " + order.getOrderNumber(), Toast.LENGTH_SHORT).show();
        });

        binding.recentOrdersRecycler.setLayoutManager(new LinearLayoutManager(getContext()));
        binding.recentOrdersRecycler.setAdapter(orderAdapter);
    }

    private void setupClickListeners() {
        // Submit order card
        binding.cardSubmitOrder.setOnClickListener(v -> {
            startActivity(new Intent(getActivity(), SubmitOrderActivity.class));
        });

        // Track order card
        binding.cardTrackOrder.setOnClickListener(v -> {
            if (getActivity() instanceof MainActivity) {
                MainActivity activity = (MainActivity) getActivity();
                // Navigate to track tab
            }
        });

        // View all orders
        binding.viewAllOrders.setOnClickListener(v -> {
            if (getActivity() instanceof MainActivity) {
                MainActivity activity = (MainActivity) getActivity();
                // Navigate to history tab
            }
        });

        // Submit first order button
        binding.btnSubmitFirstOrder.setOnClickListener(v -> {
            startActivity(new Intent(getActivity(), SubmitOrderActivity.class));
        });
    }

    private void setupSwipeRefresh() {
        binding.swipeRefresh.setColorSchemeResources(R.color.primary);
        binding.swipeRefresh.setOnRefreshListener(this::loadRecentOrders);
    }

    private void loadRecentOrders() {
        binding.loadingProgress.setVisibility(View.VISIBLE);
        binding.emptyState.setVisibility(View.GONE);

        ApiClient.getInstance().getOrderApi().getMyOrders().enqueue(new Callback<ApiResponse<List<Order>>>() {
            @Override
            public void onResponse(Call<ApiResponse<List<Order>>> call, Response<ApiResponse<List<Order>>> response) {
                binding.swipeRefresh.setRefreshing(false);
                binding.loadingProgress.setVisibility(View.GONE);

                if (response.isSuccessful() && response.body() != null) {
                    ApiResponse<List<Order>> apiResponse = response.body();
                    if (apiResponse.isSuccess() && apiResponse.getData() != null) {
                        recentOrders.clear();
                        // Show only last 5 orders
                        List<Order> orders = apiResponse.getData();
                        int limit = Math.min(orders.size(), 5);
                        for (int i = 0; i < limit; i++) {
                            recentOrders.add(orders.get(i));
                        }
                        orderAdapter.notifyDataSetChanged();

                        if (recentOrders.isEmpty()) {
                            binding.emptyState.setVisibility(View.VISIBLE);
                            binding.recentOrdersRecycler.setVisibility(View.GONE);
                        } else {
                            binding.emptyState.setVisibility(View.GONE);
                            binding.recentOrdersRecycler.setVisibility(View.VISIBLE);
                        }
                    }
                } else {
                    Log.e(TAG, "Failed to load orders");
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<List<Order>>> call, Throwable t) {
                binding.swipeRefresh.setRefreshing(false);
                binding.loadingProgress.setVisibility(View.GONE);
                Log.e(TAG, "Error loading orders", t);

                if (getContext() != null) {
                    Toast.makeText(getContext(), getString(R.string.error_network), Toast.LENGTH_SHORT).show();
                }
            }
        });
    }

    @Override
    public void onResume() {
        super.onResume();
        loadRecentOrders();
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
