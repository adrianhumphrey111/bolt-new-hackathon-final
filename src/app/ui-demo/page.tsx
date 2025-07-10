'use client';

import React, { useState } from 'react';
import { 
  Button, 
  Input, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardFooter,
  IconButton,
  Link,
  Container,
  Grid,
  GridItem,
  Flex,
  Stack,
  HStack,
  Spacer,
  Alert,
  Spinner,
  ProgressBar,
  Skeleton,
  SkeletonText,
  Modal,
  ToastProvider,
  useToast,
  VideoUploadProgressCard
} from '@/components/ui';
import { 
  Home, 
  Settings, 
  User, 
  Mail, 
  Search,
  ChevronRight,
  Download,
  Heart
} from 'lucide-react';

function ToastDemo() {
  const { addToast } = useToast();
  
  return (
    <HStack>
      <Button 
        secondary
        onClick={() => addToast({ 
          title: 'Success!', 
          description: 'Your changes have been saved.',
          variant: 'success' 
        })}
      >
        Show Success Toast
      </Button>
      <Button 
        secondary
        onClick={() => addToast({ 
          title: 'Error', 
          description: 'Something went wrong.',
          variant: 'error' 
        })}
      >
        Show Error Toast
      </Button>
    </HStack>
  );
}

export default function UIDemo() {
  const [inputValue, setInputValue] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [progress, setProgress] = useState(45);

  return (
    <ToastProvider>
      <Container className="py-12">
        <Stack spacing="xl">
          {/* Header */}
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">UI Component Library</h1>
            <p className="text-subtitle">
              A collection of reusable components built with Tailwind CSS and the Geist design system.
            </p>
          </div>

          {/* Buttons Section */}
          <Card>
            <CardHeader>
              <CardTitle>Buttons</CardTitle>
              <CardDescription>Different button variants and states</CardDescription>
            </CardHeader>
            <CardContent>
              <Stack spacing="md">
                <HStack>
                  <Button>Primary</Button>
                  <Button secondary>Secondary</Button>
                </HStack>
                
                <HStack>
                  <Button loading>Loading</Button>
                  <Button disabled>Disabled</Button>
                </HStack>
                
                <HStack>
                  <IconButton aria-label="Home">
                    <Home className="h-4 w-4" />
                  </IconButton>
                  <IconButton variant="primary" aria-label="Settings">
                    <Settings className="h-4 w-4" />
                  </IconButton>
                  <IconButton variant="danger" aria-label="Delete">
                    <Heart className="h-4 w-4" />
                  </IconButton>
                  <IconButton isRound aria-label="User">
                    <User className="h-4 w-4" />
                  </IconButton>
                </HStack>
              </Stack>
            </CardContent>
          </Card>

          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle>Form Inputs</CardTitle>
              <CardDescription>Input components with various states</CardDescription>
            </CardHeader>
            <CardContent>
              <Stack spacing="md">
                <Input 
                  placeholder="Basic input"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
                
                <Input 
                  label="Email Address"
                  type="email"
                  placeholder="you@example.com"
                  leftIcon={<Mail className="h-4 w-4" />}
                  helperText="We'll never share your email"
                />
                
                <Input 
                  label="Search"
                  placeholder="Search for anything..."
                  rightIcon={<Search className="h-4 w-4" />}
                />
                
                <Input 
                  label="Password"
                  type="password"
                  placeholder="Enter password"
                  error="Password must be at least 8 characters"
                />
                
                <Input 
                  label="Disabled Input"
                  disabled
                  value="Cannot edit this"
                />
              </Stack>
            </CardContent>
          </Card>

          {/* Layout Components */}
          <Card>
            <CardHeader>
              <CardTitle>Layout Components</CardTitle>
              <CardDescription>Grid and Flex layouts</CardDescription>
            </CardHeader>
            <CardContent>
              <Stack spacing="lg">
                <div>
                  <p className="text-sm text-subtitle mb-4">Grid Layout (3 columns, responsive)</p>
                  <Grid cols={3} gap="md" responsive>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Card key={i} variant="outlined" padding="sm">
                        <p className="text-center">Item {i}</p>
                      </Card>
                    ))}
                  </Grid>
                </div>
                
                <div>
                  <p className="text-sm text-subtitle mb-4">Flex Layout with Spacer</p>
                  <Flex className="p-4 border border-unfocused-border-color rounded-geist">
                    <Button variant="secondary">Left</Button>
                    <Spacer size="flex" />
                    <Button variant="secondary">Right</Button>
                  </Flex>
                </div>
              </Stack>
            </CardContent>
          </Card>

          {/* Feedback Components */}
          <Card>
            <CardHeader>
              <CardTitle>Feedback</CardTitle>
              <CardDescription>Loading states and progress indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <Stack spacing="lg">
                <Alert variant="info" title="Information">
                  This is an informational alert message.
                </Alert>
                
                <Alert variant="success" dismissible onDismiss={() => console.log('dismissed')}>
                  Your changes have been saved successfully!
                </Alert>
                
                <Alert variant="warning" title="Warning">
                  Your session will expire in 5 minutes.
                </Alert>
                
                <Alert variant="error" title="Error" dismissible>
                  Failed to save changes. Please try again.
                </Alert>
                
                <div>
                  <p className="text-sm text-subtitle mb-4">Progress Bars</p>
                  <Stack spacing="md">
                    <ProgressBar value={progress} showLabel label="Upload Progress" />
                    <ProgressBar value={75} variant="success" size="lg" />
                    <ProgressBar value={30} variant="warning" size="sm" />
                  </Stack>
                </div>
                
                <div>
                  <p className="text-sm text-subtitle mb-4">Loading Spinners</p>
                  <HStack>
                    <Spinner size="sm" />
                    <Spinner size="md" />
                    <Spinner size="lg" />
                    <div className="bg-foreground p-4 rounded-geist">
                      <Spinner color="white" />
                    </div>
                  </HStack>
                </div>
                
                <div>
                  <p className="text-sm text-subtitle mb-4">Skeleton Loading</p>
                  <Stack spacing="md">
                    <Skeleton variant="rectangular" height={100} />
                    <HStack>
                      <Skeleton variant="circular" width={48} height={48} />
                      <Stack className="flex-1" spacing="sm">
                        <Skeleton variant="text" width="60%" />
                        <Skeleton variant="text" />
                      </Stack>
                    </HStack>
                    <SkeletonText lines={3} />
                  </Stack>
                </div>
                
                <ToastDemo />

                <div>
                  <p className="text-sm text-subtitle mb-4">Video Upload Progress Cards</p>
                  <Stack spacing="md">
                    <VideoUploadProgressCard
                      id="1"
                      name="video1.mp4"
                      size={25000000}
                      stage="uploading"
                      progress={65}
                      timeElapsed={45}
                      estimatedTimeRemaining={30}
                    />
                    <VideoUploadProgressCard
                      id="2"
                      name="video2.mov"
                      size={45000000}
                      stage="uploaded"
                      timeElapsed={120}
                    />
                    <VideoUploadProgressCard
                      id="3"
                      name="video3.mp4"
                      size={35000000}
                      stage="analyzing"
                      timeElapsed={180}
                    />
                    <VideoUploadProgressCard
                      id="4"
                      name="video4.mov"
                      size={55000000}
                      stage="ready"
                      timeElapsed={250}
                    />
                    <VideoUploadProgressCard
                      id="5"
                      name="video5.mp4"
                      size={30000000}
                      stage="failed"
                      error="File format not supported"
                      onRetry={() => console.log('Retrying...')}
                    />
                  </Stack>
                </div>
              </Stack>
            </CardContent>
          </Card>

          {/* Card Variations */}
          <div>
            <h2 className="text-2xl font-semibold mb-6">Card Components</h2>
            <Grid cols={3} gap="md" responsive>
              <Card>
                <CardHeader>
                  <CardTitle>Default Card</CardTitle>
                  <CardDescription>A basic card with content</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-subtitle">
                    This is a default card component with standard styling.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button size="sm">Action</Button>
                </CardFooter>
              </Card>
              
              <Card variant="outlined" interactive>
                <CardHeader>
                  <CardTitle>Interactive Card</CardTitle>
                  <CardDescription>Hover to see effect</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-subtitle">
                    This card has hover effects and can be clicked.
                  </p>
                </CardContent>
              </Card>
              
              <Card variant="ghost">
                <CardHeader>
                  <CardTitle>Ghost Card</CardTitle>
                  <CardDescription>Subtle background</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-subtitle">
                    A card with minimal styling for subtle content areas.
                  </p>
                </CardContent>
              </Card>
            </Grid>
          </div>

          {/* Links */}
          <Card>
            <CardHeader>
              <CardTitle>Links</CardTitle>
              <CardDescription>Different link styles</CardDescription>
            </CardHeader>
            <CardContent>
              <HStack>
                <Link href="/ui-demo">Internal Link</Link>
                <Link href="/ui-demo" underline="always">Always Underlined</Link>
                <Link href="/ui-demo" underline="none">No Underline</Link>
                <Link href="https://example.com" external>
                  External Link
                </Link>
              </HStack>
            </CardContent>
          </Card>

          {/* Modal Demo */}
          <Card>
            <CardHeader>
              <CardTitle>Modals</CardTitle>
              <CardDescription>Dialog and overlay components</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
              
              <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Example Modal"
                description="This is a modal dialog component"
                footer={
                  <Flex justify="end" gap="sm">
                    <Button secondary onClick={() => setModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => setModalOpen(false)}>
                      Confirm
                    </Button>
                  </Flex>
                }
              >
                <Stack spacing="md">
                  <p>Modal content goes here. You can put any content inside the modal.</p>
                  <Input 
                    label="Example Input"
                    placeholder="Type something..."
                  />
                  <Alert variant="info">
                    Modals can contain other components too!
                  </Alert>
                </Stack>
              </Modal>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </ToastProvider>
  );
}