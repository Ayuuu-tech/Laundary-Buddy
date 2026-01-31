package com.laundrybuddy.api;

import com.laundrybuddy.models.ApiResponse;
import com.laundrybuddy.models.Order;

import java.util.List;
import java.util.Map;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.DELETE;
import retrofit2.http.GET;
import retrofit2.http.POST;
import retrofit2.http.PUT;
import retrofit2.http.Path;
import retrofit2.http.Query;

/**
 * Order management API endpoints
 */
public interface OrderApi {

        @POST("orders")
        Call<ApiResponse<Order>> createOrder(@Body Map<String, Object> body);

        @GET("orders/my-orders")
        Call<ApiResponse<List<Order>>> getMyOrders();

        @GET("orders/{id}")
        Call<ApiResponse<Order>> getOrderById(@Path("id") String orderId);

        @PUT("orders/{id}/status")
        Call<ApiResponse<Order>> updateOrderStatus(
                        @Path("id") String orderId,
                        @Body Map<String, Object> body);

        @PUT("orders/{id}")
        Call<ApiResponse<Order>> updateOrder(
                        @Path("id") String orderId,
                        @Body Map<String, Object> body);

        @DELETE("orders/{id}")
        Call<ApiResponse<Void>> deleteOrder(@Path("id") String orderId);

        // Admin endpoints
        @GET("orders")
        Call<ApiResponse<List<Order>>> getAllOrders();

        @GET("orders")
        Call<ApiResponse<List<Order>>> getAllOrders(
                        @Query("status") String status,
                        @Query("page") int page,
                        @Query("limit") int limit);

        @POST("orders/{id}/rate")
        Call<ApiResponse<Order>> rateOrder(
                        @Path("id") String orderId,
                        @Body Map<String, Object> body);
}
