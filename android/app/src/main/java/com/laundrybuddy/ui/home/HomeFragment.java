package com.laundrybuddy.ui.home;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.laundrybuddy.LaundryBuddyApp;
import com.laundrybuddy.R;
import com.laundrybuddy.databinding.FragmentHomeBinding;
import com.laundrybuddy.ui.orders.SubmitOrderActivity;
import com.laundrybuddy.ui.support.ContactActivity;

/**
 * Redesigned Home Fragment matching modern UI
 */
public class HomeFragment extends Fragment {

    private static final String TAG = "HomeFragment";

    private FragmentHomeBinding binding;
    private LaundryBuddyApp app;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
            @Nullable Bundle savedInstanceState) {
        binding = FragmentHomeBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        app = LaundryBuddyApp.getInstance();

        setupClickListeners();
    }

    private void setupClickListeners() {
        // Hero Buttons
        binding.btnHeroSubmit.setOnClickListener(v -> openSubmitOrder());
        binding.btnHeroTrack.setOnClickListener(v -> navigateToTab(R.id.nav_track));

        // Quick Access Cards
        binding.cardQuickSubmit.setOnClickListener(v -> openSubmitOrder());
        binding.cardQuickTrack.setOnClickListener(v -> navigateToTab(R.id.nav_track));
        binding.cardQuickHistory.setOnClickListener(v -> navigateToTab(R.id.nav_history));

        binding.cardQuickSupport.setOnClickListener(v -> {
            // Navigate to support tab
            navigateToTab(R.id.nav_support);
        });

        binding.cardQuickContact.setOnClickListener(v -> {
            startActivity(new Intent(getActivity(), ContactActivity.class));
        });

        // Extra Features
        binding.cardExtraSchedule.setOnClickListener(v -> {
            Toast.makeText(getContext(), "Scheduling feature coming soon", Toast.LENGTH_SHORT).show();
        });

        binding.cardExtraNotif.setOnClickListener(v -> {
            Toast.makeText(getContext(), "You will receive notifications here", Toast.LENGTH_SHORT).show();
        });

        binding.cardExtraQr.setOnClickListener(v -> {
            // QR is in History
            navigateToTab(R.id.nav_history);
            Toast.makeText(getContext(), "Tap an order to view QR", Toast.LENGTH_LONG).show();
        });
    }

    private void openSubmitOrder() {
        startActivity(new Intent(getActivity(), SubmitOrderActivity.class));
    }

    private void navigateToTab(int tabId) {
        if (getActivity() != null) {
            BottomNavigationView nav = getActivity().findViewById(R.id.bottomNavigation);
            if (nav != null) {
                nav.setSelectedItemId(tabId);
            }
        }
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
