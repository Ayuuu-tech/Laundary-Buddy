package com.laundrybuddy.api;

import com.laundrybuddy.models.ApiResponse;
import com.laundrybuddy.models.User;

import java.util.Map;

import okhttp3.MultipartBody;
import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.Multipart;
import retrofit2.http.POST;
import retrofit2.http.PUT;
import retrofit2.http.Part;

/**
 * Authentication API endpoints
 */
public interface AuthApi {

    @POST("auth/register")
    Call<ApiResponse<User>> register(@Body Map<String, Object> body);

    @POST("auth/login")
    Call<ApiResponse<User>> login(@Body Map<String, Object> body);

    @POST("auth/google")
    Call<ApiResponse<User>> googleLogin(@Body Map<String, Object> body);

    @POST("auth/logout")
    Call<ApiResponse<Void>> logout();

    @GET("auth/me")
    Call<ApiResponse<User>> getCurrentUser();

    @GET("auth/check")
    Call<ApiResponse<Map<String, Object>>> checkAuth();

    // OTP-based Login
    @POST("auth/request-login-otp")
    Call<ApiResponse<Void>> requestLoginOTP(@Body Map<String, Object> body);

    @POST("auth/verify-login-otp")
    Call<ApiResponse<User>> verifyLoginOTP(@Body Map<String, Object> body);

    // OTP-based Signup
    @POST("auth/request-signup-otp")
    Call<ApiResponse<Void>> requestSignupOTP(@Body Map<String, Object> body);

    @POST("auth/verify-signup-otp")
    Call<ApiResponse<User>> verifySignupOTP(@Body Map<String, Object> body);

    // OTP-based Password Reset
    @POST("auth/request-reset-otp")
    Call<ApiResponse<Void>> requestResetOTP(@Body Map<String, Object> body);

    @POST("auth/verify-reset-otp")
    Call<ApiResponse<Void>> verifyResetOTP(@Body Map<String, Object> body);

    @POST("auth/forgot-password")
    Call<ApiResponse<Void>> requestPasswordReset(@Body Map<String, Object> body);

    @Multipart
    @POST("users/profile-photo")
    Call<ApiResponse<User>> uploadProfilePhoto(@Part MultipartBody.Part photo);

    @PUT("users/profile")
    Call<ApiResponse<User>> updateProfile(@Body Map<String, String> body);
}
