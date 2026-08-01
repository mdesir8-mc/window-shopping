import { StyleSheet, Text, View } from "react-native";

// Placeholder home. Real screens (login → closets → detail → add-from-URL) land in
// Phase 6. This confirms the scaffold boots on the simulator.
export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Window Shopping</Text>
      <Text style={styles.subtitle}>Phase 3 scaffold — screens arrive in Phase 6.</Text>
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
