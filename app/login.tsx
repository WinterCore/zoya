import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import {DarkTheme} from "@react-navigation/native";
import Checkbox from "@/components/Checkbox";
import {WatchPower} from "@/lib/watchpower";
import {Storage} from "@/lib/storage";
import {useSession} from "@/contexts/session";
import {ScreenBackground} from "@/components/ScreenBackground";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saveCredentials, setSaveCredentials] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const { setSession } = useSession();

  const isButtonDisabled = username.trim().length === 0 || password.trim().length === 0 || isSubmitting;
  const handlePress = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const loginResult = await WatchPower.login(username, password);

      if (loginResult.type === "error") {
        setError("Login failed. Please check your credentials.");
        return;
      }

      if (saveCredentials) {
        await Storage.setItem("sessionData", JSON.stringify(loginResult.data));
        await Storage.setItem("credentials", JSON.stringify({ email: username, password }));
      }

      setSession(loginResult.data);
    } catch (error) {
      setError("An unknown error occurred!");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenBackground>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.card}>
          <View style={styles.logoContainer}>
            <Image style={styles.logo} source={require("../assets/images/logo.png")} />
          </View>
          <Text style={styles.title}>Zoya</Text>
          <Text style={styles.subtitle}>Log in to continue</Text>

          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your username"
            placeholderTextColor="#888"
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#888"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Checkbox style={styles.checkbox} label="Save Credentials" value={saveCredentials} onChange={setSaveCredentials} />
          <Text style={styles.error}>{error ? error : <>&nbsp;</>}</Text>

          <TouchableOpacity
            style={[styles.button, isButtonDisabled && styles.buttonDisabled]}
            onPress={handlePress}
            disabled={isButtonDisabled || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Log in</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    width: 100,
    height: 100,
  },
  card: {
    // backgroundColor: "hsl(220, 18%, 12%)",
    // borderColor: "hsl(220, 15%, 20%)",
    // borderWidth: 1,
    // borderRadius: 16,
    padding: 12,
    shadowColor: "#000",
    // shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    // shadowRadius: 16,
    // elevation: 10,
    width: "100%",
    maxWidth: 400,
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 24,
    fontSize: 14,
    color: "#ddd",
    textAlign: "center",
  },
  label: {
    fontSize: 14,
    color: "#ddd",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: "hsl(220, 20%, 8%)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#fff",
    borderWidth: 1,
    borderColor: "hsl(220, 15%, 20%)",
  },
  error: {
    marginTop: 20,
    color: "#ffb3b3",
    fontSize: 13,
    textAlign: "center",
  },
  button: {
    marginTop: 20,
    backgroundColor: DarkTheme.colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
    backgroundColor: "#555",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  linkText: {
    marginTop: 16,
    fontSize: 14,
    color: "#fff",
    textAlign: "center",
    textDecorationLine: "underline",
  },
  checkbox: {
    marginTop: 16,
    userSelect: "none",
  }
});

