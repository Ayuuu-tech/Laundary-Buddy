package com.laundrybuddy.ui.home;

import android.content.Intent;
import android.os.Bundle;
import android.view.MenuItem;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.Fragment;

import com.laundrybuddy.LaundryBuddyApp;
import com.laundrybuddy.R;
import com.laundrybuddy.api.ApiClient;
import com.laundrybuddy.databinding.ActivityMainBinding;
import com.laundrybuddy.models.ApiResponse;
import com.laundrybuddy.ui.auth.LoginActivity;
import com.laundrybuddy.ui.orders.HistoryFragment;
import com.laundrybuddy.ui.orders.SubmitOrderActivity;
import com.laundrybuddy.ui.orders.TrackOrderFragment;
import com.laundrybuddy.ui.profile.ProfileFragment;
import com.laundrybuddy.ui.support.SupportFragment;
import com.laundrybuddy.utils.SessionManager;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * Main Activity with bottom navigation
 */
public class MainActivity extends AppCompatActivity {

    private ActivityMainBinding binding;
    private LaundryBuddyApp app;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityMainBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        app = LaundryBuddyApp.getInstance();

        setupToolbar();
        setupBottomNavigation();
        setupFab();

        // Load default fragment
        if (savedInstanceState == null) {
            loadFragment(new HomeFragment());
        }
    }

    private void setupToolbar() {
        setSupportActionBar(binding.toolbar);

        binding.toolbar.setOnMenuItemClickListener(item -> {
            int id = item.getItemId();
            if (id == R.id.action_support) {
                loadFragment(new SupportFragment());
                binding.bottomNavigation.setSelectedItemId(-1);
                return true;
            } else if (id == R.id.action_dark_mode) {
                toggleDarkMode();
                return true;
            } else if (id == R.id.action_logout) {
                logout();
                return true;
            }
            return false;
        });
    }

    private void setupBottomNavigation() {
        binding.bottomNavigation.setOnItemSelectedListener(item -> {
            Fragment fragment = null;
            int id = item.getItemId();

            if (id == R.id.nav_home) {
                fragment = new HomeFragment();
                binding.fabSubmitOrder.show();
            } else if (id == R.id.nav_track) {
                fragment = new TrackOrderFragment();
                binding.fabSubmitOrder.show();
            } else if (id == R.id.nav_history) {
                fragment = new HistoryFragment();
                binding.fabSubmitOrder.hide(); // Hide FAB on History
            } else if (id == R.id.nav_profile) {
                fragment = new ProfileFragment();
                binding.fabSubmitOrder.hide(); // Hide FAB on Profile
            } else if (id == R.id.nav_support) {
                fragment = new SupportFragment();
                binding.fabSubmitOrder.hide();
            }

            if (fragment != null) {
                // Update session activity when user navigates
                if (SessionManager.getInstance() != null) {
                    SessionManager.getInstance().updateLastActivity();
                }
                loadFragment(fragment);
                return true;
            }
            return false;
        });
    }

    private void setupFab() {
        binding.fabSubmitOrder.setOnClickListener(v -> {
            Intent intent = new Intent(this, SubmitOrderActivity.class);
            startActivity(intent);
        });
    }

    private void loadFragment(Fragment fragment) {
        getSupportFragmentManager()
                .beginTransaction()
                .replace(R.id.fragmentContainer, fragment)
                .commit();
    }

    private void toggleDarkMode() {
        boolean currentMode = app.isDarkMode();
        app.setDarkMode(!currentMode);
        Toast.makeText(this, "Dark mode " + (!currentMode ? "enabled" : "disabled"), Toast.LENGTH_SHORT).show();
        // In production, you'd recreate the activity or update theme
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
        Intent intent = new Intent(this, LoginActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }

    @Override
    public void onBackPressed() {
        // If not on home, go to home first
        if (binding.bottomNavigation.getSelectedItemId() != R.id.nav_home) {
            binding.bottomNavigation.setSelectedItemId(R.id.nav_home);
        } else {
            super.onBackPressed();
        }
    }
}
