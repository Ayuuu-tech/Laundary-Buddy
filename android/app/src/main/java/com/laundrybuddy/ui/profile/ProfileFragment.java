package com.laundrybuddy.ui.profile;

import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.bumptech.glide.Glide;
import com.bumptech.glide.load.engine.DiskCacheStrategy;
import com.laundrybuddy.LaundryBuddyApp;
import com.laundrybuddy.R;
import com.laundrybuddy.api.ApiClient;
import com.laundrybuddy.databinding.FragmentProfileBinding;
import com.laundrybuddy.models.ApiResponse;
import com.laundrybuddy.models.Order;
import com.laundrybuddy.models.User;
import com.laundrybuddy.ui.auth.LoginActivity;
import com.laundrybuddy.ui.support.ContactActivity;
import com.laundrybuddy.utils.ThemeManager;
import com.laundrybuddy.utils.ToastManager;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.RequestBody;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * Profile Fragment showing user information, order statistics, and settings
 * Supports profile photo upload, edit profile mode, and dark mode toggle
 */
public class ProfileFragment extends Fragment {

    private static final String TAG = "ProfileFragment";

    private FragmentProfileBinding binding;
    private LaundryBuddyApp app;
    private ThemeManager themeManager;
    private boolean isEditMode = false;

    private final ActivityResultLauncher<String> photoPickerLauncher = registerForActivityResult(
            new ActivityResultContracts.GetContent(),
            this::handleImageResult);

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
            @Nullable Bundle savedInstanceState) {
        binding = FragmentProfileBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        app = LaundryBuddyApp.getInstance();
        themeManager = app.getThemeManager();

        setupUserInfo();
        setupSettings();
        setupClickListeners();
        setupEditMode();
        loadProfilePhoto();
        loadOrderStatistics();
        refreshUserInfo();
    }

    private void setupUserInfo() {
        binding.userName.setText(app.getUserName() != null ? app.getUserName() : "User");
        binding.userEmail.setText(app.getUserEmail() != null ? app.getUserEmail() : "Email");

        String hostelRoom = app.getPrefs().getString("hostel_room", null);
        String phone = app.getPrefs().getString("phone", null);
        binding.hostelRoom.setText(hostelRoom != null && !hostelRoom.isEmpty() ? hostelRoom : "Not set");
        binding.phone.setText(phone != null && !phone.isEmpty() ? phone : "Not set");
    }

    private void refreshUserInfo() {
        ApiClient.getInstance().getAuthApi().getCurrentUser().enqueue(new Callback<ApiResponse<User>>() {
            @Override
            public void onResponse(Call<ApiResponse<User>> call, Response<ApiResponse<User>> response) {
                if (binding == null)
                    return;
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    User user = response.body().getUser() != null ? response.body().getUser()
                            : response.body().getData();
                    if (user != null) {
                        app.saveFullUserInfo(user);
                        setupUserInfo();
                        loadProfilePhoto();
                    }
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<User>> call, Throwable t) {
                Log.e(TAG, "Failed to refresh user info", t);
            }
        });
    }

    private void loadProfilePhoto() {
        String profilePhotoUrl = app.getPrefs().getString("profile_photo", null);
        if (profilePhotoUrl != null && !profilePhotoUrl.isEmpty()) {
            String fullUrl;
            if (profilePhotoUrl.startsWith("http")) {
                fullUrl = profilePhotoUrl;
            } else {
                String baseUrl = ApiClient.getBaseUrl().replace("/api", "");
                // Ensure baseUrl doesn't end with slash if profilePhotoUrl starts with one
                if (baseUrl.endsWith("/") && profilePhotoUrl.startsWith("/")) {
                    fullUrl = baseUrl + profilePhotoUrl.substring(1);
                } else if (!baseUrl.endsWith("/") && !profilePhotoUrl.startsWith("/")) {
                    fullUrl = baseUrl + "/" + profilePhotoUrl;
                } else {
                    fullUrl = baseUrl + profilePhotoUrl;
                }
            }

            Log.d(TAG, "Loading profile photo: " + fullUrl);

            Glide.with(this)
                    .load(fullUrl)
                    .diskCacheStrategy(DiskCacheStrategy.NONE)
                    .skipMemoryCache(true)
                    .placeholder(android.R.drawable.ic_menu_gallery)
                    .error(android.R.drawable.ic_menu_gallery)
                    .into(binding.profilePhoto);
        }
    }

    private void loadOrderStatistics() {
        ApiClient.getInstance().getOrderApi().getMyOrders()
                .enqueue(new Callback<ApiResponse<List<Order>>>() {
                    @Override
                    public void onResponse(Call<ApiResponse<List<Order>>> call,
                            Response<ApiResponse<List<Order>>> response) {
                        if (binding == null)
                            return;

                        if (response.isSuccessful() && response.body() != null) {
                            ApiResponse<List<Order>> apiResponse = response.body();
                            if (apiResponse.isSuccess() && apiResponse.getData() != null) {
                                List<Order> orders = apiResponse.getData();
                                int total = orders.size();
                                int completed = 0;
                                int rated = 0;

                                for (Order order : orders) {
                                    if ("delivered".equalsIgnoreCase(order.getStatus())) {
                                        completed++;
                                    }
                                    if (order.getRating() != null && order.getRating() > 0) {
                                        rated++;
                                    }
                                }

                                binding.totalOrdersCount.setText(String.valueOf(total));
                                binding.completedOrdersCount.setText(String.valueOf(completed));
                                binding.ratingsGivenCount.setText(String.valueOf(rated));
                            }
                        }
                    }

                    @Override
                    public void onFailure(Call<ApiResponse<List<Order>>> call, Throwable t) {
                        Log.e(TAG, "Failed to load order stats", t);
                    }
                });
    }

    private void setupSettings() {
        int themeMode = themeManager.getThemeMode();
        binding.darkModeSwitch.setChecked(themeMode == ThemeManager.MODE_DARK);

        binding.darkModeSwitch.setOnCheckedChangeListener((buttonView, isChecked) -> {
            if (isChecked) {
                themeManager.setThemeMode(ThemeManager.MODE_DARK);
            } else {
                themeManager.setThemeMode(ThemeManager.MODE_LIGHT);
            }
        });
    }

    private void setupClickListeners() {
        binding.changePhotoText.setOnClickListener(v -> openPhotoPicker());
        binding.profilePhoto.setOnClickListener(v -> openPhotoPicker());
        binding.contactOption.setOnClickListener(v -> {
            startActivity(new Intent(getActivity(), ContactActivity.class));
        });
        binding.logoutButton.setOnClickListener(v -> logout());
    }

    private void setupEditMode() {
        binding.editButton.setOnClickListener(v -> toggleEditMode());
        binding.saveButton.setOnClickListener(v -> saveProfile());
    }

    private void toggleEditMode() {
        isEditMode = !isEditMode;

        if (isEditMode) {
            // Switch to edit mode
            binding.editButton.setText("Cancel");
            binding.hostelRoomDisplay.setVisibility(View.GONE);
            binding.phoneDisplay.setVisibility(View.GONE);
            binding.hostelRoomEditLayout.setVisibility(View.VISIBLE);
            binding.phoneEditLayout.setVisibility(View.VISIBLE);
            binding.saveButton.setVisibility(View.VISIBLE);

            // Pre-fill current values
            String hostelRoom = app.getPrefs().getString("hostel_room", "");
            String phone = app.getPrefs().getString("phone", "");
            binding.hostelRoomEdit.setText(hostelRoom.equals("Not set") ? "" : hostelRoom);
            binding.phoneEdit.setText(phone.equals("Not set") ? "" : phone);
        } else {
            // Switch back to display mode
            binding.editButton.setText("Edit");
            binding.hostelRoomDisplay.setVisibility(View.VISIBLE);
            binding.phoneDisplay.setVisibility(View.VISIBLE);
            binding.hostelRoomEditLayout.setVisibility(View.GONE);
            binding.phoneEditLayout.setVisibility(View.GONE);
            binding.saveButton.setVisibility(View.GONE);
        }
    }

    private void saveProfile() {
        if (binding == null || !isAdded()) return;
        
        String newHostelRoom = binding.hostelRoomEdit.getText().toString().trim();
        String newPhone = binding.phoneEdit.getText().toString().trim();

        if (newHostelRoom.isEmpty() || newPhone.isEmpty()) {
            if (getContext() != null) {
                ToastManager.showWarning(getContext(), "Please fill in all fields");
            }
            return;
        }

        // Create request body
        Map<String, String> updates = new HashMap<>();
        updates.put("hostelRoom", newHostelRoom);
        updates.put("phone", newPhone);

        ApiClient.getInstance().getAuthApi().updateProfile(updates)
                .enqueue(new Callback<ApiResponse<User>>() {
                    @Override
                    public void onResponse(Call<ApiResponse<User>> call, Response<ApiResponse<User>> response) {
                        if (binding == null || !isAdded()) return;
                        
                        if (response.isSuccessful() && response.body() != null) {
                            ApiResponse<User> apiResponse = response.body();
                            if (apiResponse.isSuccess()) {
                                // Save locally
                                app.getPrefs().edit()
                                        .putString("hostel_room", newHostelRoom)
                                        .putString("phone", newPhone)
                                        .apply();

                                // Update display
                                binding.hostelRoom.setText(newHostelRoom);
                                binding.phone.setText(newPhone);

                                // Exit edit mode
                                toggleEditMode();
                                if (getContext() != null) {
                                    ToastManager.showSuccess(getContext(), "Profile updated!");
                                }
                            } else {
                                if (getContext() != null) {
                                    ToastManager.showError(getContext(),
                                            apiResponse.getMessage() != null ? apiResponse.getMessage() : "Update failed");
                                }
                            }
                        } else {
                            if (getContext() != null) {
                                ToastManager.showError(getContext(), "Failed to update profile");
                            }
                        }
                    }

                    @Override
                    public void onFailure(Call<ApiResponse<User>> call, Throwable t) {
                        if (!isAdded()) return;
                        
                        Log.e(TAG, "Profile update failed", t);
                        if (getContext() != null) {
                            ToastManager.showError(getContext(), getString(R.string.error_network));
                        }
                    }
                });
    }

    private void openPhotoPicker() {
        photoPickerLauncher.launch("image/*");
    }

    private void handleImageResult(Uri uri) {
        if (uri == null || !isAdded()) return;

        if (getContext() != null) {
            ToastManager.showInfo(getContext(), "Uploading photo...");
        }

        try {
            File file = getFileFromUri(uri);
            if (file == null) {
                if (getContext() != null) {
                    ToastManager.showError(getContext(), "Failed to process image");
                }
                return;
            }

            RequestBody requestBody = RequestBody.create(MediaType.parse("image/*"), file);
            MultipartBody.Part photoPart = MultipartBody.Part.createFormData("photo", file.getName(), requestBody);

            ApiClient.getInstance().getAuthApi().uploadProfilePhoto(photoPart)
                    .enqueue(new Callback<ApiResponse<User>>() {
                        @Override
                        public void onResponse(Call<ApiResponse<User>> call, Response<ApiResponse<User>> response) {
                            if (binding == null || !isAdded()) return;
                            
                            Log.d(TAG, "Upload response: " + response.code() + " " + response.message());
                            if (response.isSuccessful() && response.body() != null) {
                                ApiResponse<User> apiResponse = response.body();
                                Log.d(TAG, "Upload success: " + apiResponse.isSuccess() + ", msg: "
                                        + apiResponse.getMessage());
                                if (apiResponse.isSuccess()) {
                                    User user = apiResponse.getData();
                                    if (user == null) {
                                        user = apiResponse.getUser();
                                    }

                                    if (user != null && user.getProfilePhoto() != null) {
                                        Log.d(TAG, "New photo URL: " + user.getProfilePhoto());
                                        app.getPrefs().edit()
                                                .putString("profile_photo", user.getProfilePhoto())
                                                .apply();
                                        loadProfilePhoto();
                                        if (getContext() != null) {
                                            ToastManager.showSuccess(getContext(), "Profile photo updated!");
                                        }
                                    } else {
                                        Log.w(TAG, "User or photo URL null in response");
                                        if (getContext() != null) {
                                            ToastManager.showError(getContext(), "Response missing photo data");
                                        }
                                    }
                                } else {
                                    if (getContext() != null) {
                                        ToastManager.showError(getContext(),
                                                apiResponse.getMessage() != null ? apiResponse.getMessage()
                                                        : "Upload failed");
                                    }
                                }
                            } else {
                                try {
                                    String errorBody = response.errorBody() != null ? response.errorBody().string()
                                            : "Unknown error";
                                    Log.e(TAG, "Upload failed: " + errorBody);
                                } catch (Exception e) {
                                }
                                if (getContext() != null) {
                                    ToastManager.showError(getContext(), "Failed to upload photo");
                                }
                            }
                        }

                        @Override
                        public void onFailure(Call<ApiResponse<User>> call, Throwable t) {
                            if (!isAdded()) return;
                            
                            Log.e(TAG, "Photo upload failed", t);
                            if (getContext() != null) {
                                ToastManager.showError(getContext(), getString(R.string.error_network));
                            }
                        }
                    });

        } catch (Exception e) {
            Log.e(TAG, "Error processing image", e);
            if (getContext() != null) {
                ToastManager.showError(getContext(), "Failed to process image");
            }
        }
    }

    private File getFileFromUri(Uri uri) {
        if (getContext() == null) return null;
        
        try {
            ContentResolver contentResolver = getContext().getContentResolver();
            String fileName = getFileName(uri);
            File tempFile = new File(getContext().getCacheDir(), fileName);

            InputStream inputStream = contentResolver.openInputStream(uri);
            if (inputStream != null) {
                FileOutputStream outputStream = new FileOutputStream(tempFile);
                byte[] buffer = new byte[4096];
                int bytesRead;
                while ((bytesRead = inputStream.read(buffer)) != -1) {
                    outputStream.write(buffer, 0, bytesRead);
                }
                outputStream.close();
                inputStream.close();
                return tempFile;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error getting file from URI", e);
        }
        return null;
    }

    private String getFileName(Uri uri) {
        String result = "profile_photo.jpg";
        if (getContext() == null) return result;
        
        if (uri.getScheme().equals("content")) {
            try (Cursor cursor = getContext().getContentResolver().query(uri, null, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                    if (index >= 0) {
                        result = cursor.getString(index);
                    }
                }
            }
        } else {
            String path = uri.getPath();
            if (path != null) {
                int lastSlash = path.lastIndexOf('/');
                if (lastSlash != -1) {
                    result = path.substring(lastSlash + 1);
                }
            }
        }
        return result;
    }

    private void logout() {
        ApiClient.getInstance().getAuthApi().logout().enqueue(new Callback<ApiResponse<Void>>() {
            @Override
            public void onResponse(Call<ApiResponse<Void>> call, Response<ApiResponse<Void>> response) {
                performLogout();
            }

            @Override
            public void onFailure(Call<ApiResponse<Void>> call, Throwable t) {
                performLogout();
            }
        });
    }

    private void performLogout() {
        app.clearAuth();
        Intent intent = new Intent(getActivity(), LoginActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        if (getActivity() != null) {
            getActivity().finish();
        }
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
