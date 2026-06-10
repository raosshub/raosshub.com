package com.raosshub.security;

import com.raosshub.entity.User;
import com.raosshub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    /**
     * Accepts either username or email address as the login identifier.
     *
     * Order: username first (fastest path for existing sessions where the
     * JWT stores the username), then email. This means a user whose username
     * happens to equal someone else's email would resolve to the username
     * match — acceptable because usernames and emails are both unique.
     *
     * The JWT continues to store the username (not the email), so refresh
     * and getCurrentUser flows are unaffected.
     */
    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(identifier)
            .or(() -> userRepository.findByEmail(identifier))
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + identifier));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new UsernameNotFoundException("User is inactive: " + identifier);
        }

        return UserDetailsImpl.build(user);
    }
}
