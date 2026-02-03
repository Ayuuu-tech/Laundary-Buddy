package com.laundrybuddy.api;

import com.laundrybuddy.models.ApiResponse;
import com.laundrybuddy.models.Order;

import java.util.List;
import java.util.Map;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.PUT;
import retrofit2.http.Path;
import retrofit2.http.Query;

/**
 * Admin API endpoints for staff/laundry dashboard
 */
public interface AdminApi {

@GET("admin/orders")
Call<ApiResponse<List<Order>>> getAllOrders();

@GET("admin/orders")
Call<ApiResponse<List<Order>>> getAllOrders(
@Query("status") String status,
@Query("page") int page,
@Query("limit") int limit);

@GET("admin/orders")
Call<ApiResponse<List<Order>>> getAllOrders(
@Query("status") String status,
@Query("dateFilter") String dateFilter,
@Query("search") String search,
@Query("page") int page,
@Query("limit") int limit);

@PUT("admin/orders/{id}/status")
Call<ApiResponse<Order>> updateOrderStatus(
@Path("id") String orderId,
@Body Map<String, Object> body);

@GET("admin/stats")
Call<ApiResponse<Map<String, Object>>> getStats();
}
