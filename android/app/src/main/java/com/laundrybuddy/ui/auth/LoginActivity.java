package com.laundrybuddy.ui.auth;

import android.content.Intent;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.Log;
import android.util.Patterns;
import android.view.View;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;
import com.laundrybuddy.LaundryBuddyApp;
import com.laundrybuddy.R;
import com.laundrybuddy.api.ApiClient;
import com.laundrybuddy.databinding.ActivityLoginBinding;
import com.laundrybuddy.models.ApiResponse;
import com.laundrybuddy.models.User;
import com.laundrybuddy.ui.home.MainActivity;
import com.laundrybuddy.ui.staff.StaffDashboardActivity;

import java.util.HashMap;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * Login Activity handling email/password and Google Sign-In
 */
public class LoginActivity extends AppCompatActivity {

    private static final String TAG = "LoginActivity";
    private static final int RC_SIGN_IN = 9001;

    private ActivityLoginBinding binding;
    private GoogleSignInClient googleSignInClient;
    private LaundryBuddyApp app;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        app = LaundryBuddyApp.getInstance();

        // Check if already logged in - Redirect immediately before UI setup
        if (app.isLoggedIn()) {
            navigateToHome();
            return;
        }

        binding = ActivityLoginBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        setupGoogleSignIn();
        setupClickListeners();
    }

    private void setupGoogleSignIn() {
        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestEmail()
                .requestProfile()
                .requestIdToken(getString(R.string.google_client_id))
                .build();

        googleSignInClient = GoogleSignIn.getClient(this, gso);
    }

    private void setupClickListeners() {
        // Login button
        binding.loginButton.setOnClickListener(v -> attemptLogin());

        // Google Sign-In button
        binding.googleSignInButton.setOnClickListener(v -> signInWithGoogle());

        // Signup link
        binding.signupLink.setOnClickListener(v -> {
            startActivity(new Intent(this, SignupActivity.class));
        });

        // Forgot password
        binding.forgotPasswordText.setOnClickListener(v -> {
            Toast.makeText(this, "Password reset feature coming soon", Toast.LENGTH_SHORT).show();
        });

        // Staff login
        binding.staffLoginText.setOnClickListener(v -> {
            // Show staff login dialog or navigate to staff login
            Toast.makeText(this, "Staff login - use your staff credentials", Toast.LENGTH_SHORT).show();
        });
    }

    private void attemptLogin() {
        // Reset errors
        binding.emailLayout.setError(null);
        binding.passwordLayout.setError(null);

        String email = binding.emailInput.getText().toString().trim();
        String password = binding.passwordInput.getText().toString();

        // Validate email
        if (TextUtils.isEmpty(email)) {
            binding.emailLayout.setError(getString(R.string.error_required_field));
            binding.emailInput.requestFocus();
            return;
        }

        if (!Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            binding.emailLayout.setError(getString(R.string.error_invalid_email));
            binding.emailInput.requestFocus();
            return;
        }

        // Validate password
        if (TextUtils.isEmpty(password)) {
            binding.passwordLayout.setError(getString(R.string.error_required_field));
            binding.passwordInput.requestFocus();
            return;
        }

        if (password.length() < 6) {
            binding.passwordLayout.setError(getString(R.string.error_password_short));
            binding.passwordInput.requestFocus();
            return;
        }

        // Show loading
        setLoading(true);

        // Make API call
        Map<String, Object> body = new HashMap<>();
        body.put("email", email);
        body.put("password", password);

        ApiClient.getInstance().getAuthApi().login(body).enqueue(new Callback<ApiResponse<User>>() {
            @Override
            public void onResponse(Call<ApiResponse<User>> call, Response<ApiResponse<User>> response) {
                setLoading(false);

                Log.d(TAG, "Login response code: " + response.code());

                if (response.isSuccessful() && response.body() != null) {
                    ApiResponse<User> apiResponse = response.body();
                    Log.d(TAG, "Login success: " + apiResponse.isSuccess());

                    if (apiResponse.isSuccess()) {
                        if (apiResponse.getToken() != null) {
                            Log.d(TAG, "Got token, saving...");
                            app.saveAuthToken(apiResponse.getToken());

                            // Extract userId from JWT token as backup
                            String userId = extractUserIdFromToken(apiResponse.getToken());
                            if (userId != null) {
                                Log.d(TAG, "Extracted userId from token: " + userId);
                            }
                        }
                        User user = apiResponse.getUser() != null ? apiResponse.getUser() : apiResponse.getData();
                        if (user != null) {
                            Log.d(TAG, "Got user - id: " + user.getId() + ", name: " + user.getName());
                            handleLoginSuccess(user);
                            String tokenStatus = (apiResponse.getToken() != null) ? "Token RX" : "Token NULL";
                            Toast.makeText(LoginActivity.this, "Login OK. " + tokenStatus, Toast.LENGTH_LONG).show();
                        } else {
                            // User object is null, try to extract from token
                            String userId = extractUserIdFromToken(apiResponse.getToken());
                            if (userId != null) {
                                Log.d(TAG, "User null but extracting from token: " + userId);
                                app.saveUserInfo(userId, "", "", "student");
                                app.setSessionActive(true);
                                navigateToHome();
                            } else {
                                Toast.makeText(LoginActivity.this, getString(R.string.error_login_failed),
                                        Toast.LENGTH_SHORT).show();
                            }
                        }
                    } else {
                        String error = apiResponse.getMessage() != null ? apiResponse.getMessage()
                                : getString(R.string.error_login_failed);
                        Toast.makeText(LoginActivity.this, error, Toast.LENGTH_SHORT).show();
                    }
                } else {
                    Log.e(TAG, "Login failed with code: " + response.code());
                    Toast.makeText(LoginActivity.this, getString(R.string.error_login_failed), Toast.LENGTH_SHORT)
                            .show();
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<User>> call, Throwable t) {
                setLoading(false);
                Log.e(TAG, "Login failed", t);
                Toast.makeText(LoginActivity.this, getString(R.string.error_network), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void signInWithGoogle() {
        Intent signInIntent = googleSignInClient.getSignInIntent();
        startActivityForResult(signInIntent, RC_SIGN_IN);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == RC_SIGN_IN) {
            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
            handleGoogleSignInResult(task);
        }
    }

    private void handleGoogleSignInResult(Task<GoogleSignInAccount> completedTask) {
        try {
            GoogleSignInAccount account = completedTask.getResult(ApiException.class);
            if (account != null) {
                sendGoogleTokenToBackend(account.getIdToken());
            }
        } catch (ApiException e) {
            Log.e(TAG, "Google sign-in failed: " + e.getStatusCode());
            Toast.makeText(this, "Google sign-in failed", Toast.LENGTH_SHORT).show();
        }
    }

    private void sendGoogleTokenToBackend(String idToken) {
        setLoading(true);

        Map<String, Object> body = new HashMap<>();
        body.put("credential", idToken);

        ApiClient.getInstance().getAuthApi().googleLogin(body).enqueue(new Callback<ApiResponse<User>>() {
            @Override
            public void onResponse(Call<ApiResponse<User>> call, Response<ApiResponse<User>> response) {
                setLoading(false);

                if (response.isSuccessful() && response.body() != null) {
                    ApiResponse<User> apiResponse = response.body();
                    if (apiResponse.isSuccess()) {
                        if (apiResponse.getToken() != null) {
                            app.saveAuthToken(apiResponse.getToken());
                        }
                        User user = apiResponse.getUser() != null ? apiResponse.getUser() : apiResponse.getData();
                        if (user != null) {
                            handleLoginSuccess(user);
                        }
                    } else {
                        Toast.makeText(LoginActivity.this, "Google sign-in failed", Toast.LENGTH_SHORT).show();
                    }
                } else {
                    Toast.makeText(LoginActivity.this, "Google sign-in failed", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<User>> call, Throwable t) {
                setLoading(false);
                Log.e(TAG, "Google login failed", t);
                Toast.makeText(LoginActivity.this, getString(R.string.error_network), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void handleLoginSuccess(User user) {
        // Save user info
        app.setSessionActive(true);
        app.saveFullUserInfo(user);
        Log.d(TAG, "Saved user info - id: " + user.getId());

        Toast.makeText(this, getString(R.string.login_success), Toast.LENGTH_SHORT).show();

        // Navigate based on role
        if (user.isAdmin() || user.isStaff()) {
            navigateToStaffDashboard();
        } else {
            navigateToHome();
        }
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

    private void navigateToHome() {
        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }

    private void navigateToStaffDashboard() {
        Intent intent = new Intent(this, StaffDashboardActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }

    private void setLoading(boolean loading) {
        binding.loadingProgress.setVisibility(loading ? View.VISIBLE : View.GONE);
        binding.loginButton.setEnabled(!loading);
        binding.googleSignInButton.setEnabled(!loading);
        binding.emailInput.setEnabled(!loading);
        binding.passwordInput.setEnabled(!loading);
    }
}
