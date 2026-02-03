package com.laundrybuddy.models;

import androidx.annotation.NonNull;
import androidx.room.Entity;
import androidx.room.Ignore;
import androidx.room.PrimaryKey;
import androidx.room.TypeConverters;

import com.google.gson.annotations.SerializedName;
import com.laundrybuddy.db.Converters;

import java.util.List;

/**
 * Order model matching backend Order schema
 */
@Entity(tableName = "orders")
@TypeConverters({ Converters.class })
public class Order {

    @PrimaryKey
    @NonNull
    @SerializedName("_id")
    private String id;

    @SerializedName("orderNumber")
    private String orderNumber;

    @SerializedName("userId")
    private String userId;

    @SerializedName("userName")
    private String userName;

    @SerializedName("userEmail")
    private String userEmail;

    @SerializedName("hostelRoom")
    private String hostelRoom;

    // Populated user object from backend (when using .populate('user'))
    // Ignored by Room - only used for JSON parsing
    @Ignore
    @SerializedName("user")
    private PopulatedUser user;

    @SerializedName("items")
    private List<OrderItem> items;

    @SerializedName("totalItems")
    private int totalItems;

    @SerializedName("specialInstructions")
    private String specialInstructions;

    @SerializedName("status")
    private String status;

    @SerializedName("createdAt")
    private String createdAt;

    @SerializedName("updatedAt")
    private String updatedAt;

    @SerializedName("estimatedDelivery")
    private String estimatedDelivery;

    // Removed root 'rating' field as it's not in backend schema at root level
    // @SerializedName("rating")
    // private Integer rating;

    @SerializedName("feedback")
    private Feedback feedback;

    @SerializedName("isPriority")
    private Boolean isPriority;

    public static class Feedback {
        @SerializedName("rating")
        private Integer rating;

        @SerializedName("comment")
        private String comment;

        @SerializedName("submittedAt")
        private String submittedAt;

        public Integer getRating() {
            return rating;
        }

        public void setRating(Integer rating) {
            this.rating = rating;
        }

        public String getComment() {
            return comment;
        }

        public void setComment(String comment) {
            this.comment = comment;
        }
    }

    // Nested PopulatedUser class for backend .populate('user') response
    public static class PopulatedUser {
        @SerializedName("_id")
        private String id;

        @SerializedName("name")
        private String name;

        @SerializedName("email")
        private String email;

        @SerializedName("phone")
        private String phone;

        @SerializedName("address")
        private String address;

        public String getId() {
            return id;
        }

        public String getName() {
            return name;
        }

        public String getEmail() {
            return email;
        }

        public String getPhone() {
            return phone;
        }

        public String getAddress() {
            return address;
        }
    }

    public Integer getRating() {
        if (feedback != null)
            return feedback.rating;
        return 0;
    }

    public void setRating(Integer rating) {
        // This is tricky. If we set rating, we should update feedback object
        if (feedback == null)
            feedback = new Feedback();
        feedback.rating = rating;
    }

    public Feedback getFeedback() {
        return feedback;
    }

    public void setFeedback(Feedback feedback) {
        this.feedback = feedback;
    }

    public boolean isRated() {
        return feedback != null && feedback.rating != null && feedback.rating > 0;
    }

    // Nested OrderItem class
    public static class OrderItem {
        @SerializedName("name")
        private String name;

        @SerializedName("quantity")
        private int quantity;

        @SerializedName("category")
        private String category;

        // Backend also uses these field names
        @SerializedName("type")
        private String type;

        @SerializedName("count")
        private int count;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public int getQuantity() {
            return quantity;
        }

        public void setQuantity(int quantity) {
            this.quantity = quantity;
        }

        public String getCategory() {
            return category;
        }

        public void setCategory(String category) {
            this.category = category;
        }

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public int getCount() {
            return count;
        }

        public void setCount(int count) {
            this.count = count;
        }
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public PopulatedUser getUser() {
        return user;
    }

    public void setUser(PopulatedUser user) {
        this.user = user;
    }

    // Get user phone from populated user
    public String getUserPhone() {
        if (user != null && user.getPhone() != null) {
            return user.getPhone();
        }
        return null;
    }

    public String getOrderNumber() {
        return orderNumber;
    }

    public void setOrderNumber(String orderNumber) {
        this.orderNumber = orderNumber;
    }

    public String getUserId() {
        // First try direct field
        if (userId != null && !userId.isEmpty()) {
            return userId;
        }
        // Then try populated user object
        if (user != null && user.getId() != null) {
            return user.getId();
        }
        return null;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getUserName() {
        // First try direct field
        if (userName != null && !userName.isEmpty()) {
            return userName;
        }
        // Then try populated user object
        if (user != null && user.getName() != null) {
            return user.getName();
        }
        return null;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public String getUserEmail() {
        // First try direct field
        if (userEmail != null && !userEmail.isEmpty()) {
            return userEmail;
        }
        // Then try populated user object
        if (user != null && user.getEmail() != null) {
            return user.getEmail();
        }
        return null;
    }

    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail;
    }

    public String getHostelRoom() {
        // First try direct field
        if (hostelRoom != null && !hostelRoom.isEmpty()) {
            return hostelRoom;
        }
        // Then try populated user's address (which contains room info)
        if (user != null && user.getAddress() != null) {
            return user.getAddress();
        }
        return null;
    }

    public void setHostelRoom(String hostelRoom) {
        this.hostelRoom = hostelRoom;
    }

    public List<OrderItem> getItems() {
        return items;
    }

    public void setItems(List<OrderItem> items) {
        this.items = items;
    }

    public int getTotalItems() {
        // If totalItems is set, use it
        if (totalItems > 0) {
            return totalItems;
        }
        // Otherwise calculate from items list
        if (items != null && !items.isEmpty()) {
            int total = 0;
            for (OrderItem item : items) {
                // Try quantity first, then count
                if (item.getQuantity() > 0) {
                    total += item.getQuantity();
                } else if (item.getCount() > 0) {
                    total += item.getCount();
                }
            }
            return total > 0 ? total : items.size();
        }
        return 0;
    }

    public void setTotalItems(int totalItems) {
        this.totalItems = totalItems;
    }

    public String getSpecialInstructions() {
        return specialInstructions;
    }

    public void setSpecialInstructions(String specialInstructions) {
        this.specialInstructions = specialInstructions;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getEstimatedDelivery() {
        return estimatedDelivery;
    }

    public void setEstimatedDelivery(String estimatedDelivery) {
        this.estimatedDelivery = estimatedDelivery;
    }

    // Helper method to get formatted status
    public String getStatusDisplay() {
        if (status == null)
            return "Unknown";
        switch (status.toLowerCase()) {
            case "pending":
                return "Pending";
            case "received":
                return "Received";
            case "washing":
                return "Washing";
            case "drying":
                return "Drying";
            case "folding":
                return "Folding";
            case "ready":
                return "Ready for Pickup";
            case "delivered":
                return "Delivered";
            case "cancelled":
                return "Cancelled";
            default:
                return status;
        }
    }

    public boolean isDelivered() {
        return "delivered".equalsIgnoreCase(status) || "completed".equalsIgnoreCase(status);
    }

    public Boolean getIsPriority() {
        return isPriority;
    }

    public void setIsPriority(Boolean isPriority) {
        this.isPriority = isPriority;
    }

    @Ignore
    public boolean isPriority() {
        return isPriority != null && isPriority;
    }
}
