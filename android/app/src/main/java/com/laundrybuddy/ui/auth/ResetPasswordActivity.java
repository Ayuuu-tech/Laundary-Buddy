package com.laundrybuddy.ui.auth;

import android.os.Bundle;
import android.text.TextUtils;
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
 * Password Reset Activity
 */
public class ResetPasswordActivity extends AppCompatActivity {

    private ActivityResetPasswordBinding binding;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityResetPasswordBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        setupClickListeners();
    }

    private void setupClickListeners() {
        binding.resetButton.setOnClickListener(v -> requestPasswordReset());
        binding.backToLogin.setOnClickListener(v -> finish());
    }

    private void requestPasswordReset() {
        binding.emailLayout.setError(null);

        String email = binding.emailInput.getText().toString().trim();

        if (TextUtils.isEmpty(email) || !Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            binding.emailLayout.setError(getString(R.string.error_invalid_email));
            return;
        }

        setLoading(true);

        Map<String, Object> body = new HashMap<>();
        body.put("email", email);

        ApiClient.getInstance().getAuthApi().requestPasswordReset(body).enqueue(new Callback<ApiResponse<Void>>() {
            @Override
            public void onResponse(Call<ApiResponse<Void>> call, Response<ApiResponse<Void>> response) {
                setLoading(false);
                // Always show success to prevent email enumeration
                binding.successLayout.setVisibility(View.VISIBLE);
                binding.resetButton.setVisibility(View.GONE);
                binding.emailLayout.setVisibility(View.GONE);
            }

            @Override
            public void onFailure(Call<ApiResponse<Void>> call, Throwable t) {
                setLoading(false);
                // Still show success for security
                binding.successLayout.setVisibility(View.VISIBLE);
                binding.resetButton.setVisibility(View.GONE);
                binding.emailLayout.setVisibility(View.GONE);
            }
        });
    }

    private void setLoading(boolean loading) {
        binding.loadingProgress.setVisibility(loading ? View.VISIBLE : View.GONE);
        binding.resetButton.setEnabled(!loading);
    }
}
