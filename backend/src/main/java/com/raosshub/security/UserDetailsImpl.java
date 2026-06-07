package com.raosshub.security;

import com.raosshub.entity.User;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

@Data
@AllArgsConstructor
public class UserDetailsImpl implements UserDetails {

    private Long id;
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private String role;
    private List<String> teams;
    private boolean canViewActivity;

    @JsonIgnore
    private String password;

    private Collection<? extends GrantedAuthority> authorities;

    public static UserDetailsImpl build(User user) {
        List<GrantedAuthority> authorities = List.of(
            new SimpleGrantedAuthority("ROLE_" + user.getRole().toUpperCase())
        );

        List<String> teams = user.getTeams() != null
            ? List.of(user.getTeams())
            : List.of();

        return new UserDetailsImpl(
            user.getId(),
            user.getUsername(),
            user.getEmail(),
            user.getFirstName(),
            user.getLastName(),
            user.getRole(),
            teams,
            Boolean.TRUE.equals(user.getCanViewActivity()),
            user.getPasswordHash(),
            authorities
        );
    }

    public boolean isSuperAdmin() {
        return "superadmin".equals(role);
    }

    public boolean isAdmin() {
        return "superadmin".equals(role) || "admin".equals(role);
    }

    public boolean isViewer() {
        return "viewer".equals(role);
    }

    @Override
    public boolean isAccountNonExpired() { return true; }

    @Override
    public boolean isAccountNonLocked() { return true; }

    @Override
    public boolean isCredentialsNonExpired() { return true; }

    @Override
    public boolean isEnabled() { return true; }
}
