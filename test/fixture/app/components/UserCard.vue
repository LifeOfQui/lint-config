<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  name: string
  role?: string
}>()

const emit = defineEmits<{
  select: [name: string]
}>()

const label = computed(() => (props.role ? `${props.name} (${props.role})` : props.name))
</script>

<template>
  <button type="button" @click="emit('select', props.name)">
    {{ label }}
  </button>
</template>
