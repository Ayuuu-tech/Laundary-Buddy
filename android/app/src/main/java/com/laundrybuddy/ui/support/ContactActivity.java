package com.laundrybuddy.ui.support;

import android.os.Bundle;
import android.text.TextUtils;
import android.util.Log;
import android.util.Patterns;
import android.view.View;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.laundrybuddy.LaundryBuddyApp;
import com.laundrybuddy.R;
import com.laundrybuddy.api.ApiClient;
import com.laundrybuddy.databinding.ActivityContactBinding;
import com.laundrybuddy.models.ApiResponse;
import com.laundrybuddy.models.ContactMessage;

import java.util.HashMap;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * Contact Activity for sending messages to support
 */
public class ContactActivity extends AppCompatActivity {

    private static final String TAG = "ContactActivity";

    private ActivityContactBinding binding;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityContactBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        prefillUserInfo();
        setupClickListeners();
    }

    private void prefillUserInfo() {
        LaundryBuddyApp app = LaundryBuddyApp.getInstance();
        binding.nameInput.setText(app.getUserName());
        binding.emailInput.setText(app.getUserEmail());
    }

    private void setupClickListeners() {
        binding.backButton.setOnClickListener(v -> finish());
        binding.sendButton.setOnClickListener(v -> sendMessage());
    }

    private void sendMessage() {
        // Reset errors
        binding.nameLayout.setError(null);
        binding.emailLayout.setError(null);
        binding.subjectLayout.setError(null);
        binding.messageLayout.setError(null);

        String name = binding.nameInput.getText().toString().trim();
        String email = binding.emailInput.getText().toString().trim();
        String subject = binding.subjectInput.getText().toString().trim();
        String message = binding.messageInput.getText().toString().trim();

        // Validate
        if (TextUtils.isEmpty(name)) {
            binding.nameLayout.setError(getString(R.string.error_required_field));
            return;
        }

        if (TextUtils.isEmpty(email) || !Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            binding.emailLayout.setError(getString(R.string.error_invalid_email));
            return;
        }

        if (TextUtils.isEmpty(subject)) {
            binding.subjectLayout.setError(getString(R.string.error_required_field));
            return;
        }

        if (TextUtils.isEmpty(message)) {
            binding.messageLayout.setError(getString(R.string.error_required_field));
            return;
        }

        setLoading(true);

        Map<String, Object> body = new HashMap<>();
        body.put("name", name);
        body.put("email", email);
        body.put("subject", subject);
        body.put("message", message);

        ApiClient.getInstance().getSupportApi().sendContactMessage(body)
                .enqueue(new Callback<ApiResponse<ContactMessage>>() {
                    @Override
                    public void onResponse(Call<ApiResponse<ContactMessage>> call,
                            Response<ApiResponse<ContactMessage>> response) {
                        setLoading(false);

                        if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                            Toast.makeText(ContactActivity.this, getString(R.string.message_sent), Toast.LENGTH_SHORT)
                                    .show();
                            finish();
                        } else {
                            Toast.makeText(ContactActivity.this, "Failed to send message", Toast.LENGTH_SHORT).show();
                        }
                    }

                    @Override
                    public void onFailure(Call<ApiResponse<ContactMessage>> call, Throwable t) {
                        setLoading(false);
                        Log.e(TAG, "Failed to send message", t);
                        Toast.makeText(ContactActivity.this, getString(R.string.error_network), Toast.LENGTH_SHORT)
                                .show();
                    }
                });
    }

    private void setLoading(boolean loading) {
        binding.loadingProgress.setVisibility(loading ? View.VISIBLE : View.GONE);
        binding.sendButton.setEnabled(!loading);
    }
}
