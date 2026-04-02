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
 * Signup Activity for new user registration (email/password + Google)
 */
public class SignupActivity extends AppCompatActivity {

    private static final String TAG = "SignupActivity";
    private static final int RC_SIGN_IN = 9002;

    private ActivitySignupBinding binding;
    private LaundryBuddyApp app;
    private GoogleSignInClient googleSignInClient;

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
        // Signup button
        binding.signupButton.setOnClickListener(v -> attemptSignup());

        // Google Sign-Up button
        binding.googleSignUpButton.setOnClickListener(v -> signUpWithGoogle());

        // Login link
        binding.loginLink.setOnClickListener(v -> {
            finish(); // Go back to login
        });
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
        // Reset errors
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

        // Validate name
        if (TextUtils.isEmpty(name)) {
            binding.nameLayout.setError(getString(R.string.error_required_field));
            binding.nameInput.requestFocus();
            return;
        }

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

        // Validate hostel room
        if (TextUtils.isEmpty(hostelRoom)) {
            binding.hostelRoomLayout.setError(getString(R.string.error_required_field));
            binding.hostelRoomInput.requestFocus();
            return;
        }

        // Validate password
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

        // Password strength check
        if (!isPasswordStrong(password)) {
            binding.passwordLayout
                    .setError("Password must contain uppercase, lowercase, number, and special character");
            binding.passwordInput.requestFocus();
            return;
        }

        // Validate confirm password
        if (!password.equals(confirmPassword)) {
            binding.confirmPasswordLayout.setError(getString(R.string.error_passwords_mismatch));
            binding.confirmPasswordInput.requestFocus();
            return;
        }

        // Show loading
        setLoading(true);

        // Make API call
        Map<String, Object> body = new HashMap<>();
        body.put("name", name);
        body.put("email", email);
        body.put("hostelRoom", hostelRoom);
        body.put("password", password);

        if (!TextUtils.isEmpty(phone)) {
            body.put("phone", phone);
        }

        ApiClient.getInstance().getAuthApi().register(body).enqueue(new Callback<ApiResponse<User>>() {
            @Override
            public void onResponse(Call<ApiResponse<User>> call, Response<ApiResponse<User>> response) {
                setLoading(false);

                if (response.isSuccessful() && response.body() != null) {
                    ApiResponse<User> apiResponse = response.body();
                    if (apiResponse.isSuccess()) {
                        User user = apiResponse.getUser() != null ? apiResponse.getUser() : apiResponse.getData();
                        if (user != null) {
                            handleSignupSuccess(user);
                        } else {
                            // Registration successful, but no user returned - go to login
                            Toast.makeText(SignupActivity.this, getString(R.string.signup_success), Toast.LENGTH_SHORT)
                                    .show();
                            finish();
                        }
                    } else {
                        String error = apiResponse.getMessage() != null ? apiResponse.getMessage() : "Signup failed";
                        Toast.makeText(SignupActivity.this, error, Toast.LENGTH_SHORT).show();
                    }
                } else {
                    String error = "Signup failed";
                    try {
                        if (response.errorBody() != null) {
                            error = response.errorBody().string();
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "Error parsing error body", e);
                    }
                    Toast.makeText(SignupActivity.this, error, Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<User>> call, Throwable t) {
                setLoading(false);
                Log.e(TAG, "Signup failed", t);
                Toast.makeText(SignupActivity.this, getString(R.string.error_network), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private boolean isPasswordStrong(String password) {
        boolean hasUppercase = !password.equals(password.toLowerCase());
        boolean hasLowercase = !password.equals(password.toUpperCase());
        boolean hasDigit = password.matches(".*\\d.*");
        boolean hasSpecial = password.matches(".*[!@#$%^&*(),.?\":{}|<>].*");

        return hasUppercase && hasLowercase && hasDigit && hasSpecial;
    }

    private void handleSignupSuccess(User user) {
        // Save user info
        app.setSessionActive(true);
        app.saveFullUserInfo(user);

        Toast.makeText(this, getString(R.string.signup_success), Toast.LENGTH_SHORT).show();

        // Navigate to home
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
