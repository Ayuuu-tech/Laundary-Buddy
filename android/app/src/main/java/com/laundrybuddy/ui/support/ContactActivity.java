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
import com.laundrybuddy.models.User;

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
        fetchUserInfoFromServer();
        setupClickListeners();
    }

    private void prefillUserInfo() {
        LaundryBuddyApp app = LaundryBuddyApp.getInstance();
        String name = app.getUserName();
        String email = app.getUserEmail();

        Log.d(TAG, "Prefilling user info from prefs: Name=" + name + ", Email=" + email);

        if (name != null && !name.trim().isEmpty()) {
            binding.nameInput.setText(name);
            binding.nameInput.setEnabled(false);
            binding.nameLayout.setEnabled(false);
        }

        if (email != null && !email.trim().isEmpty()) {
            binding.emailInput.setText(email);
            binding.emailInput.setEnabled(false);
            binding.emailLayout.setEnabled(false);
        }
    }

    private void fetchUserInfoFromServer() {
        ApiClient.getInstance().getAuthApi().getCurrentUser().enqueue(new Callback<ApiResponse<User>>() {
            @Override
            public void onResponse(Call<ApiResponse<User>> call, Response<ApiResponse<User>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    User user = response.body().getUser() != null ? response.body().getUser()
                            : response.body().getData();
                    if (user != null) {
                        Log.d(TAG, "Fetched user info from server: " + user.getName());
                        // Save locally too
                        LaundryBuddyApp.getInstance().saveFullUserInfo(user);

                        // Update UI if empty or mismatch
                        if (user.getName() != null && !user.getName().isEmpty()) {
                            binding.nameInput.setText(user.getName());
                            binding.nameInput.setEnabled(false);
                            binding.nameLayout.setHelperText("Verified from account");
                        }

                        if (user.getEmail() != null && !user.getEmail().isEmpty()) {
                            binding.emailInput.setText(user.getEmail());
                            binding.emailInput.setEnabled(false);
                            binding.emailLayout.setHelperText("Verified from account");
                        }
                    }
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<User>> call, Throwable t) {
                Log.e(TAG, "Failed to fetch user info from server", t);
            }
        });
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

        if (message.length() < 5) {
            binding.messageLayout.setError("Message must be at least 5 characters");
            return;
        }

        setLoading(true);

        Map<String, Object> body = new HashMap<>();
        body.put("name", name);
        body.put("email", email);
        body.put("subject", subject);
        body.put("message", message);
        body.put("hostelRoom", LaundryBuddyApp.getInstance().getPrefs().getString("hostel_room", ""));

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
