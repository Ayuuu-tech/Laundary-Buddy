package com.laundrybuddy.ui.auth;

import android.content.Intent;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.Log;
import android.util.Patterns;
import android.view.View;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;
import com.google.android.material.textfield.TextInputLayout;
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
 * Login Activity handling email/password with OTP verification and Google Sign-In
 */
public class LoginActivity extends AppCompatActivity {

    private static final String TAG = "LoginActivity";
    private static final int RC_SIGN_IN = 9001;

    private ActivityLoginBinding binding;
    private GoogleSignInClient googleSignInClient;
    private LaundryBuddyApp app;
    private boolean isStaffMode = false;

    // Store email/password for OTP flow
    private String pendingEmail;
    private String pendingPassword;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        app = LaundryBuddyApp.getInstance();

        // Check if already logged in
        if (app.isLoggedIn()) {
            if (app.isUserStaff()) {
                navigateToStaffDashboard();
            } else {
                navigateToHome();
            }
            return;
        }

        binding = ActivityLoginBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        setupGoogleSignIn();
        setupClickListeners();

        if (getIntent().getBooleanExtra("session_expired", false)) {
            Toast.makeText(this, "Session expired. Please login again.", Toast.LENGTH_LONG).show();
        }
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
        binding.loginButton.setOnClickListener(v -> attemptLogin());
        binding.googleSignInButton.setOnClickListener(v -> signInWithGoogle());

        binding.signupLink.setOnClickListener(v -> {
            startActivity(new Intent(this, SignupActivity.class));
        });

        // Forgot password - navigate to ResetPasswordActivity
        binding.forgotPasswordText.setOnClickListener(v -> {
            startActivity(new Intent(this, ResetPasswordActivity.class));
        });

        // Staff/Student login toggle
        binding.staffLoginText.setOnClickListener(v -> {
            if (!isStaffMode) {
                isStaffMode = true;
                binding.staffLoginText.setText("Login as Student");
                binding.emailInput.setText("laundry@bmu.edu.in");
                binding.passwordInput.setText("");
                binding.passwordInput.requestFocus();
                Toast.makeText(this, "Enter staff password to login", Toast.LENGTH_SHORT).show();
            } else {
                isStaffMode = false;
                binding.staffLoginText.setText("Login as Staff");
                binding.emailInput.setText("");
                binding.passwordInput.setText("");
                binding.emailInput.requestFocus();
            }
        });
    }

    private void attemptLogin() {
        binding.emailLayout.setError(null);
        binding.passwordLayout.setError(null);

        String email = binding.emailInput.getText().toString().trim();
        String password = binding.passwordInput.getText().toString();

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

        setLoading(true);

        // Store for OTP verification
        pendingEmail = email;
        pendingPassword = password;

        // Request OTP (validates credentials + sends OTP email)
        Map<String, Object> body = new HashMap<>();
        body.put("email", email);
        body.put("password", password);

        ApiClient.getInstance().getAuthApi().requestLoginOTP(body).enqueue(new Callback<ApiResponse<Void>>() {
            @Override
            public void onResponse(Call<ApiResponse<Void>> call, Response<ApiResponse<Void>> response) {
                setLoading(false);

                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    Toast.makeText(LoginActivity.this, "OTP sent to your email!", Toast.LENGTH_SHORT).show();
                    showOtpDialog();
                } else {
                    String error = "Invalid email or password";
                    if (response.body() != null && response.body().getMessage() != null) {
                        error = response.body().getMessage();
                    }
                    Toast.makeText(LoginActivity.this, error, Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<Void>> call, Throwable t) {
                setLoading(false);
                Log.e(TAG, "Login OTP request failed", t);
                Toast.makeText(LoginActivity.this, getString(R.string.error_network), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void showOtpDialog() {
        View dialogView = getLayoutInflater().inflate(R.layout.dialog_otp_verification, null);
        AlertDialog dialog = new AlertDialog.Builder(this)
                .setView(dialogView)
                .setCancelable(false)
                .create();

        TextInputEditText otpInput = dialogView.findViewById(R.id.otpInput);
        TextInputLayout otpLayout = dialogView.findViewById(R.id.otpLayout);
        MaterialButton verifyButton = dialogView.findViewById(R.id.verifyButton);
        TextView resendOtp = dialogView.findViewById(R.id.resendOtp);
        View otpLoading = dialogView.findViewById(R.id.otpLoading);
        TextView otpMessage = dialogView.findViewById(R.id.otpMessage);

        otpMessage.setText("We've sent a 6-digit OTP to " + pendingEmail);

        verifyButton.setOnClickListener(v -> {
            String otp = otpInput.getText().toString().trim();
            if (otp.length() != 6) {
                otpLayout.setError("Enter 6-digit OTP");
                return;
            }
            otpLayout.setError(null);
            verifyButton.setEnabled(false);
            otpLoading.setVisibility(View.VISIBLE);

            Map<String, Object> body = new HashMap<>();
            body.put("email", pendingEmail);
            body.put("otp", otp);

            ApiClient.getInstance().getAuthApi().verifyLoginOTP(body).enqueue(new Callback<ApiResponse<User>>() {
                @Override
                public void onResponse(Call<ApiResponse<User>> call, Response<ApiResponse<User>> response) {
                    verifyButton.setEnabled(true);
                    otpLoading.setVisibility(View.GONE);

                    if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                        dialog.dismiss();
                        ApiResponse<User> apiResponse = response.body();

                        if (apiResponse.getToken() != null) {
                            app.saveAuthToken(apiResponse.getToken());
                        }

                        User user = apiResponse.getUser() != null ? apiResponse.getUser() : apiResponse.getData();
                        if (user != null) {
                            handleLoginSuccess(user);
                        }
                    } else {
                        String error = "Invalid OTP";
                        if (response.body() != null && response.body().getMessage() != null) {
                            error = response.body().getMessage();
                        }
                        otpLayout.setError(error);
                    }
                }

                @Override
                public void onFailure(Call<ApiResponse<User>> call, Throwable t) {
                    verifyButton.setEnabled(true);
                    otpLoading.setVisibility(View.GONE);
                    otpLayout.setError("Network error. Please try again.");
                }
            });
        });

        resendOtp.setOnClickListener(v -> {
            resendOtp.setEnabled(false);
            Map<String, Object> body = new HashMap<>();
            body.put("email", pendingEmail);
            body.put("password", pendingPassword);

            ApiClient.getInstance().getAuthApi().requestLoginOTP(body).enqueue(new Callback<ApiResponse<Void>>() {
                @Override
                public void onResponse(Call<ApiResponse<Void>> call, Response<ApiResponse<Void>> response) {
                    resendOtp.setEnabled(true);
                    Toast.makeText(LoginActivity.this, "OTP resent!", Toast.LENGTH_SHORT).show();
                }

                @Override
                public void onFailure(Call<ApiResponse<Void>> call, Throwable t) {
                    resendOtp.setEnabled(true);
                    Toast.makeText(LoginActivity.this, "Failed to resend OTP", Toast.LENGTH_SHORT).show();
                }
            });
        });

        // Allow cancel via a custom button (hidden X)
        dialogView.setOnClickListener(null);

        dialog.show();
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
        app.setSessionActive(true);
        app.saveFullUserInfo(user);
        Log.d(TAG, "Saved user info - id: " + user.getId());

        Toast.makeText(this, getString(R.string.login_success), Toast.LENGTH_SHORT).show();

        if (user.isAdmin() || user.isStaff()) {
            navigateToStaffDashboard();
        } else {
            navigateToHome();
        }
    }

    private String extractUserIdFromToken(String token) {
        if (token == null) return null;
        try {
            String[] parts = token.split("\\.");
            if (parts.length < 2) return null;
            String payload = new String(android.util.Base64.decode(parts[1], android.util.Base64.URL_SAFE));
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
