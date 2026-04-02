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
import com.laundrybuddy.databinding.ActivitySignupBinding;
import com.laundrybuddy.models.ApiResponse;
import com.laundrybuddy.models.User;
import com.laundrybuddy.ui.home.MainActivity;

import java.util.HashMap;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * Signup Activity with OTP verification and Google Sign-Up
 */
public class SignupActivity extends AppCompatActivity {

    private static final String TAG = "SignupActivity";
    private static final int RC_SIGN_IN = 9002;

    private ActivitySignupBinding binding;
    private LaundryBuddyApp app;
    private GoogleSignInClient googleSignInClient;

    // Store signup data for OTP flow
    private Map<String, Object> pendingSignupData;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivitySignupBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        app = LaundryBuddyApp.getInstance();

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
        binding.signupButton.setOnClickListener(v -> attemptSignup());
        binding.googleSignUpButton.setOnClickListener(v -> signUpWithGoogle());
        binding.loginLink.setOnClickListener(v -> finish());
    }

    private void signUpWithGoogle() {
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
            Log.e(TAG, "Google sign-up failed: " + e.getStatusCode());
            Toast.makeText(this, "Google sign-up failed", Toast.LENGTH_SHORT).show();
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
                            handleSignupSuccess(user);
                            Toast.makeText(SignupActivity.this,
                                    "Welcome, " + user.getName() + "!", Toast.LENGTH_SHORT).show();
                        }
                    } else {
                        String error = apiResponse.getMessage() != null ? apiResponse.getMessage()
                                : "Google sign-up failed";
                        Toast.makeText(SignupActivity.this, error, Toast.LENGTH_SHORT).show();
                    }
                } else {
                    Toast.makeText(SignupActivity.this, "Google sign-up failed", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<User>> call, Throwable t) {
                setLoading(false);
                Log.e(TAG, "Google signup failed", t);
                Toast.makeText(SignupActivity.this, getString(R.string.error_network), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void attemptSignup() {
        binding.nameLayout.setError(null);
        binding.emailLayout.setError(null);
        binding.hostelRoomLayout.setError(null);
        binding.passwordLayout.setError(null);
        binding.confirmPasswordLayout.setError(null);

        String name = binding.nameInput.getText().toString().trim();
        String email = binding.emailInput.getText().toString().trim();
        String hostelRoom = binding.hostelRoomInput.getText().toString().trim();
        String phone = binding.phoneInput.getText().toString().trim();
        String password = binding.passwordInput.getText().toString();
        String confirmPassword = binding.confirmPasswordInput.getText().toString();

        if (TextUtils.isEmpty(name)) {
            binding.nameLayout.setError(getString(R.string.error_required_field));
            binding.nameInput.requestFocus();
            return;
        }

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

        if (TextUtils.isEmpty(hostelRoom)) {
            binding.hostelRoomLayout.setError(getString(R.string.error_required_field));
            binding.hostelRoomInput.requestFocus();
            return;
        }

        if (TextUtils.isEmpty(password)) {
            binding.passwordLayout.setError(getString(R.string.error_required_field));
            binding.passwordInput.requestFocus();
            return;
        }

        if (password.length() < 8) {
            binding.passwordLayout.setError(getString(R.string.error_password_short));
            binding.passwordInput.requestFocus();
            return;
        }

        if (!isPasswordStrong(password)) {
            binding.passwordLayout
                    .setError("Password must contain uppercase, lowercase, number, and special character");
            binding.passwordInput.requestFocus();
            return;
        }

        if (!password.equals(confirmPassword)) {
            binding.confirmPasswordLayout.setError(getString(R.string.error_passwords_mismatch));
            binding.confirmPasswordInput.requestFocus();
            return;
        }

        setLoading(true);

        // Build signup data
        pendingSignupData = new HashMap<>();
        pendingSignupData.put("name", name);
        pendingSignupData.put("email", email);
        pendingSignupData.put("hostelRoom", hostelRoom);
        pendingSignupData.put("password", password);
        if (!TextUtils.isEmpty(phone)) {
            pendingSignupData.put("phone", phone);
        }

        // Request Signup OTP
        ApiClient.getInstance().getAuthApi().requestSignupOTP(pendingSignupData).enqueue(new Callback<ApiResponse<Void>>() {
            @Override
            public void onResponse(Call<ApiResponse<Void>> call, Response<ApiResponse<Void>> response) {
                setLoading(false);

                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    Toast.makeText(SignupActivity.this, "OTP sent to your email!", Toast.LENGTH_SHORT).show();
                    showOtpDialog(email);
                } else {
                    String error = "Signup failed";
                    if (response.body() != null && response.body().getMessage() != null) {
                        error = response.body().getMessage();
                    } else {
                        try {
                            if (response.errorBody() != null) {
                                String errBody = response.errorBody().string();
                                org.json.JSONObject errJson = new org.json.JSONObject(errBody);
                                if (errJson.has("message")) {
                                    error = errJson.getString("message");
                                }
                            }
                        } catch (Exception ignored) {}
                    }
                    Toast.makeText(SignupActivity.this, error, Toast.LENGTH_LONG).show();
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<Void>> call, Throwable t) {
                setLoading(false);
                Log.e(TAG, "Signup OTP request failed", t);
                Toast.makeText(SignupActivity.this, getString(R.string.error_network), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void showOtpDialog(String email) {
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
        TextView otpTitle = dialogView.findViewById(R.id.otpTitle);
        TextView otpMessage = dialogView.findViewById(R.id.otpMessage);

        otpTitle.setText("Verify Email");
        otpMessage.setText("We've sent a 6-digit OTP to " + email);

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
            body.put("email", email);
            body.put("otp", otp);

            ApiClient.getInstance().getAuthApi().verifySignupOTP(body).enqueue(new Callback<ApiResponse<User>>() {
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
                            handleSignupSuccess(user);
                        } else {
                            Toast.makeText(SignupActivity.this, getString(R.string.signup_success), Toast.LENGTH_SHORT).show();
                            finish();
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
            ApiClient.getInstance().getAuthApi().requestSignupOTP(pendingSignupData).enqueue(new Callback<ApiResponse<Void>>() {
                @Override
                public void onResponse(Call<ApiResponse<Void>> call, Response<ApiResponse<Void>> response) {
                    resendOtp.setEnabled(true);
                    Toast.makeText(SignupActivity.this, "OTP resent!", Toast.LENGTH_SHORT).show();
                }

                @Override
                public void onFailure(Call<ApiResponse<Void>> call, Throwable t) {
                    resendOtp.setEnabled(true);
                    Toast.makeText(SignupActivity.this, "Failed to resend OTP", Toast.LENGTH_SHORT).show();
                }
            });
        });

        // Close button to dismiss dialog
        dialogView.findViewById(R.id.closeDialog).setOnClickListener(v -> dialog.dismiss());

        dialog.show();
    }

    private boolean isPasswordStrong(String password) {
        boolean hasUppercase = !password.equals(password.toLowerCase());
        boolean hasLowercase = !password.equals(password.toUpperCase());
        boolean hasDigit = password.matches(".*\\d.*");
        boolean hasSpecial = password.matches(".*[!@#$%^&*(),.?\":{}|<>].*");
        return hasUppercase && hasLowercase && hasDigit && hasSpecial;
    }

    private void handleSignupSuccess(User user) {
        app.setSessionActive(true);
        app.saveFullUserInfo(user);

        Toast.makeText(this, getString(R.string.signup_success), Toast.LENGTH_SHORT).show();

        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }

    private void setLoading(boolean loading) {
        binding.loadingProgress.setVisibility(loading ? View.VISIBLE : View.GONE);
        binding.signupButton.setEnabled(!loading);
        binding.googleSignUpButton.setEnabled(!loading);
        binding.nameInput.setEnabled(!loading);
        binding.emailInput.setEnabled(!loading);
        binding.hostelRoomInput.setEnabled(!loading);
        binding.phoneInput.setEnabled(!loading);
        binding.passwordInput.setEnabled(!loading);
        binding.confirmPasswordInput.setEnabled(!loading);
    }
}
