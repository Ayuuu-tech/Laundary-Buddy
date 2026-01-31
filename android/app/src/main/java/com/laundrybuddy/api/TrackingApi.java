package com.laundrybuddy.api;

import com.laundrybuddy.models.ApiResponse;
import com.laundrybuddy.models.Tracking;

import java.util.List;
import java.util.Map;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.POST;
import retrofit2.http.PUT;
import retrofit2.http.Path;
import retrofit2.http.Query;

/**
 * Order tracking API endpoints
 */
public interface TrackingApi {

        @GET("tracking/search")
        Call<ApiResponse<List<Tracking>>> searchOrders(@Query("q") String query);

        @GET("tracking/order/{orderNumber}")
        Call<ApiResponse<Tracking>> getOrderByNumber(@Path("orderNumber") String orderNumber);

        @POST("tracking/notify/{orderNumber}")
        Call<ApiResponse<Tracking>> toggleNotify(@Path("orderNumber") String orderNumber);

        @PUT("tracking/order/{orderNumber}")
        Call<ApiResponse<Tracking>> updateOrderStatus(
                        @Path("orderNumber") String orderNumber,
                        @Body Map<String, Object> body);

        // Admin endpoints
        @GET("tracking/all")
        Call<ApiResponse<List<Tracking>>> getAllTracking(
                        @Query("status") String status,
                        @Query("page") int page,
                        @Query("limit") int limit);
}
