package com.laundrybuddy.ui.auth;

import android.os.Bundle;
import android.text.TextUtils;
import android.util.Log;
import android.util.Patterns;
import android.view.View;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.laundrybuddy.R;
import com.laundrybuddy.api.ApiClient;
import com.laundrybuddy.databinding.ActivityResetPasswordBinding;
import com.laundrybuddy.models.ApiResponse;

import java.util.HashMap;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * Password Reset Activity with OTP verification
 * Step 1: Enter email → Send OTP
 * Step 2: Enter OTP + New Password → Reset
 */
public class ResetPasswordActivity extends AppCompatActivity {

    private static final String TAG = "ResetPasswordActivity";

    private ActivityResetPasswordBinding binding;
    private String pendingEmail;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityResetPasswordBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        setupClickListeners();
    }

    private void setupClickListeners() {
        binding.sendOtpButton.setOnClickListener(v -> requestOTP());
        binding.resetButton.setOnClickListener(v -> resetPassword());
        binding.backToLogin.setOnClickListener(v -> finish());
        binding.resendOtp.setOnClickListener(v -> resendOTP());
    }

    private void requestOTP() {
        binding.emailLayout.setError(null);

        String email = binding.emailInput.getText().toString().trim();

        if (TextUtils.isEmpty(email) || !Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            binding.emailLayout.setError(getString(R.string.error_invalid_email));
            return;
        }

        pendingEmail = email;
        setLoading(true);

        Map<String, Object> body = new HashMap<>();
        body.put("email", email);

        ApiClient.getInstance().getAuthApi().requestResetOTP(body).enqueue(new Callback<ApiResponse<Void>>() {
            @Override
            public void onResponse(Call<ApiResponse<Void>> call, Response<ApiResponse<Void>> response) {
                setLoading(false);

                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    Toast.makeText(ResetPasswordActivity.this, "OTP sent to your email!", Toast.LENGTH_SHORT).show();
                    showOtpStep();
                } else {
                    String error = "Failed to send OTP";
                    if (response.body() != null && response.body().getMessage() != null) {
                        error = response.body().getMessage();
                    }
                    Toast.makeText(ResetPasswordActivity.this, error, Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<Void>> call, Throwable t) {
                setLoading(false);
                Log.e(TAG, "Reset OTP request failed", t);
                Toast.makeText(ResetPasswordActivity.this, getString(R.string.error_network), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void showOtpStep() {
        binding.emailStep.setVisibility(View.GONE);
        binding.otpStep.setVisibility(View.VISIBLE);
        binding.subtitleText.setText("Enter the OTP sent to " + pendingEmail + " and your new password.");
    }

    private void resetPassword() {
        binding.otpLayout.setError(null);
        binding.newPasswordLayout.setError(null);
        binding.confirmPasswordLayout.setError(null);

        String otp = binding.otpInput.getText().toString().trim();
        String newPassword = binding.newPasswordInput.getText().toString();
        String confirmPassword = binding.confirmPasswordInput.getText().toString();

        if (otp.length() != 6) {
            binding.otpLayout.setError("Enter 6-digit OTP");
            return;
        }

        if (TextUtils.isEmpty(newPassword)) {
            binding.newPasswordLayout.setError(getString(R.string.error_required_field));
            return;
        }

        if (newPassword.length() < 8) {
            binding.newPasswordLayout.setError(getString(R.string.error_password_short));
            return;
        }

        if (!newPassword.equals(confirmPassword)) {
            binding.confirmPasswordLayout.setError(getString(R.string.error_passwords_mismatch));
            return;
        }

        setLoading(true);

        Map<String, Object> body = new HashMap<>();
        body.put("email", pendingEmail);
        body.put("otp", otp);
        body.put("newPassword", newPassword);

        ApiClient.getInstance().getAuthApi().verifyResetOTP(body).enqueue(new Callback<ApiResponse<Void>>() {
            @Override
            public void onResponse(Call<ApiResponse<Void>> call, Response<ApiResponse<Void>> response) {
                setLoading(false);

                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    Toast.makeText(ResetPasswordActivity.this, "Password reset successful!", Toast.LENGTH_LONG).show();
                    showSuccess();
                } else {
                    String error = "Invalid OTP or reset failed";
                    if (response.body() != null && response.body().getMessage() != null) {
                        error = response.body().getMessage();
                    }
                    binding.otpLayout.setError(error);
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<Void>> call, Throwable t) {
                setLoading(false);
                Log.e(TAG, "Password reset failed", t);
                Toast.makeText(ResetPasswordActivity.this, getString(R.string.error_network), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void showSuccess() {
        binding.otpStep.setVisibility(View.GONE);
        binding.successLayout.setVisibility(View.VISIBLE);
        binding.backToLogin.setText("Go to Login");
    }

    private void resendOTP() {
        binding.resendOtp.setEnabled(false);

        Map<String, Object> body = new HashMap<>();
        body.put("email", pendingEmail);

        ApiClient.getInstance().getAuthApi().requestResetOTP(body).enqueue(new Callback<ApiResponse<Void>>() {
            @Override
            public void onResponse(Call<ApiResponse<Void>> call, Response<ApiResponse<Void>> response) {
                binding.resendOtp.setEnabled(true);
                Toast.makeText(ResetPasswordActivity.this, "OTP resent!", Toast.LENGTH_SHORT).show();
            }

            @Override
            public void onFailure(Call<ApiResponse<Void>> call, Throwable t) {
                binding.resendOtp.setEnabled(true);
                Toast.makeText(ResetPasswordActivity.this, "Failed to resend OTP", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void setLoading(boolean loading) {
        binding.loadingProgress.setVisibility(loading ? View.VISIBLE : View.GONE);
        if (binding.emailStep.getVisibility() == View.VISIBLE) {
            binding.sendOtpButton.setEnabled(!loading);
        }
        if (binding.otpStep.getVisibility() == View.VISIBLE) {
            binding.resetButton.setEnabled(!loading);
        }
    }
}
