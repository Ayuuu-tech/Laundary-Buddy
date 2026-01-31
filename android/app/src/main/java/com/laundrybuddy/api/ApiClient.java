package com.laundrybuddy.api;

import android.content.Context;
import android.util.Log;

import com.laundrybuddy.BuildConfig;

import java.net.CookieManager;
import java.net.CookiePolicy;
import java.util.concurrent.TimeUnit;

import okhttp3.JavaNetCookieJar;
import okhttp3.OkHttpClient;
import okhttp3.logging.HttpLoggingInterceptor;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

/**
 * Singleton API client using Retrofit
 * Handles cookie-based session authentication
 */
public class ApiClient {

    private static final String TAG = "ApiClient";
    private static ApiClient instance;

    private final Retrofit retrofit;
    private final AuthApi authApi;
    private final OrderApi orderApi;
    private final TrackingApi trackingApi;
    private final SupportApi supportApi;

    private ApiClient(Context context) {
        // Cookie manager for session handling
        CookieManager cookieManager = new CookieManager();
        cookieManager.setCookiePolicy(CookiePolicy.ACCEPT_ALL);

        // Logging interceptor for debugging
        HttpLoggingInterceptor loggingInterceptor = new HttpLoggingInterceptor(message -> Log.d(TAG, message));
        loggingInterceptor.setLevel(BuildConfig.DEBUG
                ? HttpLoggingInterceptor.Level.BODY
                : HttpLoggingInterceptor.Level.NONE);

        // OkHttp client with cookie jar and timeouts
        OkHttpClient okHttpClient = new OkHttpClient.Builder()
                .cookieJar(new JavaNetCookieJar(cookieManager))
                .addInterceptor(loggingInterceptor)
                .addInterceptor(chain -> {
                    okhttp3.Request original = chain.request();
                    String token = com.laundrybuddy.LaundryBuddyApp.getInstance().getAuthToken();

                    if (token != null && !token.isEmpty()) {
                        okhttp3.Request request = original.newBuilder()
                                .header("Authorization", "Bearer " + token)
                                .method(original.method(), original.body())
                                .build();
                        return chain.proceed(request);
                    }
                    return chain.proceed(original);
                })
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)
                .build();

        // Retrofit instance
        retrofit = new Retrofit.Builder()
                .baseUrl(BuildConfig.API_BASE_URL + "/")
                .client(okHttpClient)
                .addConverterFactory(GsonConverterFactory.create())
                .build();

        // Create API interfaces
        authApi = retrofit.create(AuthApi.class);
        orderApi = retrofit.create(OrderApi.class);
        trackingApi = retrofit.create(TrackingApi.class);
        supportApi = retrofit.create(SupportApi.class);

        Log.d(TAG, "API Client initialized with base URL: " + BuildConfig.API_BASE_URL);
    }

    public static synchronized void init(Context context) {
        if (instance == null) {
            instance = new ApiClient(context.getApplicationContext());
        }
    }

    public static ApiClient getInstance() {
        if (instance == null) {
            throw new IllegalStateException(
                    "ApiClient must be initialized first. Call init() in Application.onCreate()");
        }
        return instance;
    }

    public AuthApi getAuthApi() {
        return authApi;
    }

    public OrderApi getOrderApi() {
        return orderApi;
    }

    public TrackingApi getTrackingApi() {
        return trackingApi;
    }

    public SupportApi getSupportApi() {
        return supportApi;
    }

    public Retrofit getRetrofit() {
        return retrofit;
    }

    public static String getBaseUrl() {
        return BuildConfig.API_BASE_URL;
    }
}
