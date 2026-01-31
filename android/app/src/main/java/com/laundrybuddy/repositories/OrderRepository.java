package com.laundrybuddy.repositories;

import android.content.Context;
import android.util.Log;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.laundrybuddy.LaundryBuddyApp;
import com.laundrybuddy.api.ApiClient;
import com.laundrybuddy.api.OrderApi;
import com.laundrybuddy.db.AppDatabase;
import com.laundrybuddy.db.OrderDao;
import com.laundrybuddy.models.ApiResponse;
import com.laundrybuddy.models.Order;
import com.laundrybuddy.utils.NetworkUtils;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class OrderRepository {
    private static final String TAG = "OrderRepository";
    private OrderApi orderApi;
    private OrderDao orderDao;
    private Context context;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    public OrderRepository(Context context) {
        this.context = context;
        this.orderApi = ApiClient.getInstance().getOrderApi();
        AppDatabase db = LaundryBuddyApp.getInstance().getDatabase();
        if (db != null) {
            this.orderDao = db.orderDao();
        }
    }

    public LiveData<List<Order>> getOrders() {
        if (NetworkUtils.isNetworkAvailable(context)) {
            refreshOrders();
        }
        return orderDao.getAllOrders();
    }

    public LiveData<List<Order>> getMyOrders(String userId) {
        if (NetworkUtils.isNetworkAvailable(context)) {
            refreshMyOrders(userId);
        }
        return orderDao.getOrdersForUser(userId);
    }

    public void refreshMyOrders(String userId) {
        if (!NetworkUtils.isNetworkAvailable(context)) {
            return;
        }

        Call<ApiResponse<List<Order>>> call = orderApi.getMyOrders();

        call.enqueue(new Callback<ApiResponse<List<Order>>>() {
            @Override
            public void onResponse(Call<ApiResponse<List<Order>>> call, Response<ApiResponse<List<Order>>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().getData() != null) {
                    List<Order> orders = response.body().getData();
                    // Ensure userId is set on orders if backend doesn't send it explicitly (it
                    // should, but safety first)
                    // Actually, modifying orders here is good practice before insert.
                    for (Order o : orders) {
                        if (o.getUserId() == null)
                            o.setUserId(userId);
                    }

                    executor.execute(() -> {
                        // Clear old data for simple sync? Or assume upsert is enough?
                        // For full consistency, clear user's orders first.
                        orderDao.clearOrdersForUser(userId);
                        orderDao.insertOrders(orders);
                    });
                } else {
                    Log.e(TAG, "Failed to refresh my orders: " + response.message());
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<List<Order>>> call, Throwable t) {
                Log.e(TAG, "Failed to refresh my orders", t);
            }
        });
    }

    public void refreshOrders() {
        if (!NetworkUtils.isNetworkAvailable(context)) {
            return;
        }

        // Assuming admin/staff endpoint, otherwise use getMyOrders for students
        // Here assuming Staff context for now as per dashboard
        Call<ApiResponse<List<Order>>> call = orderApi.getAllOrders();

        call.enqueue(new Callback<ApiResponse<List<Order>>>() {
            @Override
            public void onResponse(Call<ApiResponse<List<Order>>> call, Response<ApiResponse<List<Order>>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().getData() != null) {
                    List<Order> orders = response.body().getData();
                    executor.execute(() -> {
                        orderDao.clearAll();
                        orderDao.insertOrders(orders);
                    });
                } else {
                    Log.e(TAG, "Failed to refresh orders: " + response.message());
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<List<Order>>> call, Throwable t) {
                Log.e(TAG, "Failed to refresh orders", t);
            }
        });
    }
}
