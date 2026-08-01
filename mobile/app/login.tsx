import { StyleSheet, Text, View } from "react-native";

// Placeholder login route. It exists now so the api client's 401 → router.replace("/login")
// has a valid (typed) target. The real Google + email/password screen lands in Phase 5.
export default function Login() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in</Text>
      <Text style={styles.subtitle}>Auth screen arrives in Phase 5.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  title: {
    fontSize: 24,
    fontWeight: "600"
  },
  subtitle: {
    marginTop: 8,
    opacity: 0.6,
    textAlign: "center"
  }
});
