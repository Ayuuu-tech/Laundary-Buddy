package com.laundrybuddy.workers;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import com.laundrybuddy.R;
import com.laundrybuddy.api.ApiClient;
import com.laundrybuddy.models.ApiResponse;
import com.laundrybuddy.models.Tracking;
import com.laundrybuddy.ui.home.MainActivity;

import java.io.IOException;

import retrofit2.Response;

public class OrderTrackingWorker extends Worker {

    public static final String KEY_ORDER_NUMBER = "order_number";
    private static final String CHANNEL_ID = "order_updates";

    public OrderTrackingWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    @NonNull
    @Override
    public Result doWork() {
        String orderNumber = getInputData().getString(KEY_ORDER_NUMBER);
        if (orderNumber == null)
            return Result.failure();

        try {
            // Ensure API client is ready
            try {
                ApiClient.getInstance();
            } catch (IllegalStateException e) {
                ApiClient.init(getApplicationContext());
            }

            // Call API synchronously
            Response<ApiResponse<Tracking>> response = ApiClient.getInstance()
                    .getTrackingApi().getOrderByNumber(orderNumber).execute();

            if (response.isSuccessful() && response.body() != null && response.body().getData() != null) {
                Tracking tracking = response.body().getData();

                // If notification was disabled on server, stop tracking
                if (!tracking.isNotifyWhenReady()) {
                    // We can't cancel ourselves easily, but we can stop notifying
                    // Ideally, the cancellation happens from UI when user toggles off.
                    // But if toggled off elsewhere, we should stop.
                    // We'll return success and hope app syncs.
                    return Result.success();
                }

                String status = tracking.getStatus();

                if ("ready".equalsIgnoreCase(status) || "delivered".equalsIgnoreCase(status)
                        || "ready-for-pickup".equalsIgnoreCase(status)) {
                    sendNotification(orderNumber, status);

                    // We can try to cancel this work now that we notified
                    // Note: This requires the work name convention to be known
                    // WorkManager.getInstance(getApplicationContext()).cancelUniqueWork("track_" +
                    // orderNumber);
                    // But we can't reliably call this from inside without risk.
                    // Returning success is fine, the user will see notification.
                    return Result.success();
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
            return Result.retry();
        }

        return Result.success();
    }

    private void sendNotification(String orderNumber, String status) {
        Context context = getApplicationContext();
        NotificationManager notificationManager = (NotificationManager) context
                .getSystemService(Context.NOTIFICATION_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Order Updates",
                    NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Notifications for order status updates");
            notificationManager.createNotificationChannel(channel);
        }

        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        // We could pass order ID to open it directly if MainActivity handles it
        PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent,
                PendingIntent.FLAG_IMMUTABLE);

        String title = "Laundry Order Update";
        String message = "Your order #" + orderNumber + " is now " + status + "!";

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher) // Use launcher icon or a notification icon if available
                .setContentTitle(title)
                .setContentText(message)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true);

        // ID based on order number hash to allow multiple notifications
        notificationManager.notify(orderNumber.hashCode(), builder.build());
    }
}
