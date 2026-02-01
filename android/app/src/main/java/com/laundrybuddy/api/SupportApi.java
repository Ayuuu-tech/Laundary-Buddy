package com.laundrybuddy.api;

import com.laundrybuddy.models.ApiResponse;
import com.laundrybuddy.models.ContactMessage;
import com.laundrybuddy.models.SupportTicket;

import java.util.List;
import java.util.Map;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.POST;
import retrofit2.http.PUT;
import retrofit2.http.Path;

/**
 * Support and Contact API endpoints
 */
public interface SupportApi {

    // Support Tickets
    // Support Tickets
    @POST("support/report")
    Call<ApiResponse<SupportTicket>> createTicket(@Body Map<String, Object> body);

    @GET("support/my-tickets")
    Call<ApiResponse<List<SupportTicket>>> getMyTickets();

    // Not present in backend file viewed
    // @GET("support/tickets/{id}")
    // Call<ApiResponse<SupportTicket>> getTicketById(@Path("id") String ticketId);

    @PUT("support/update-ticket/{id}")
    Call<ApiResponse<SupportTicket>> updateTicket(
            @Path("id") String ticketId,
            @Body Map<String, Object> body);

    // Contact Messages
    @POST("contact")
    Call<ApiResponse<ContactMessage>> sendContactMessage(@Body Map<String, Object> body);

    // Admin endpoints
    @GET("support/all-tickets")
    Call<ApiResponse<List<SupportTicket>>> getAllTickets();

    @GET("contact/messages")
    Call<ApiResponse<List<ContactMessage>>> getAllContactMessages();
}
