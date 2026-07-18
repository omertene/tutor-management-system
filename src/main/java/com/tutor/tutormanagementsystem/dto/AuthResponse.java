package com.tutor.tutormanagementsystem.dto;

import com.tutor.tutormanagementsystem.model.Role;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
public class AuthResponse {

    private UUID id;
    private String email;
    private String fullName;
    private Role role;

    private String token;
}
