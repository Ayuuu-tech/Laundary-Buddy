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
        if (binding == null) return;
        
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
            if (getActivity() != null) {
                startActivity(new Intent(getActivity(), ContactActivity.class));
            }
        });

        // Extra Features
        binding.cardExtraSchedule.setOnClickListener(v -> {
            if (getContext() != null) {
                Toast.makeText(getContext(), "Scheduling feature coming soon", Toast.LENGTH_SHORT).show();
            }
        });

        binding.cardExtraNotif.setOnClickListener(v -> {
            if (getContext() != null) {
                Toast.makeText(getContext(), "You will receive notifications here", Toast.LENGTH_SHORT).show();
            }
        });

        binding.cardExtraQr.setOnClickListener(v -> {
            // QR is in History
            navigateToTab(R.id.nav_history);
            if (getContext() != null) {
                Toast.makeText(getContext(), "Tap an order to view QR", Toast.LENGTH_LONG).show();
            }
        });
    }

    private void navigateToTab(int tabId) {
        if (!isAdded() || getActivity() == null) return;
        
        try {
            BottomNavigationView nav = getActivity().findViewById(R.id.bottomNavigation);
            if (nav != null) {
                nav.setSelectedItemId(tabId);
            }
        } catch (Exception e) {
            // Fragment may have been detached
        }
    }
    
    private void openSubmitOrder() {
        if (!isAdded() || getActivity() == null) return;
        startActivity(new Intent(getActivity(), SubmitOrderActivity.class));
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
