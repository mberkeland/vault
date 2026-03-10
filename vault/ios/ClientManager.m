//
//  ClientManager.m
//  VonageVault
//
//  Created by iujie on 09/03/2026.
//

#import "ClientManager.h"
#import "EventEmitter.h"
#import <VonageClientSDKVoice/VonageClientSDKVoice.h>

@interface ClientManager ()
@property VGVoiceClient *client;
@property (nonatomic, assign) BOOL isMutedInternal;
@end

@implementation ClientManager

RCT_EXPORT_MODULE();

+ (nonnull ClientManager *)shared {
  static ClientManager *sharedInstance = nil;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    sharedInstance = [ClientManager new];
    [sharedInstance setupClient];
  });
  return sharedInstance;
}

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

- (void)setupClient {
  VGVoiceClient.isUsingCallKit = NO;
  self.client = [[VGVoiceClient alloc] init];
  VGClientConfig *config = [[VGClientConfig alloc] initWithRegion:VGConfigRegionUS];
  [self.client setConfig:config];
}

RCT_EXPORT_METHOD(login:(NSString *)jwt) {
  [ClientManager.shared.client createSession:jwt
                                    callback:^(NSError * _Nullable error, NSString * _Nullable sessionId) {
    if (error != nil) {
      [ClientManager.shared.eventEmitter sendStatusEventWith:@"Error"];
      return;
    } else {
      [ClientManager.shared.eventEmitter sendStatusEventWith:@"Connected"];
    }
  }];
}

RCT_EXPORT_METHOD(makeCall:(NSString *)number) {
  [ClientManager.shared.client serverCall:@{@"to": number} callback:^(NSError * _Nullable error, VGCallId  _Nullable call) {
    if (error != nil) {
      [ClientManager.shared.eventEmitter sendCallStateEventWith:@"Error"];
      return;
    }
    [ClientManager.shared.eventEmitter sendCallStateEventWith:@"On Call"];
    [ClientManager.shared setCallId:call];
    self.isMutedInternal = false;
    [self enableNoiseSuppression];
  }];
}

RCT_EXPORT_METHOD(endCall) {
  [ClientManager.shared.client hangup:ClientManager.shared.callId callback:^(NSError * _Nullable error) {
    ClientManager.shared.callId  = nil;
    [ClientManager.shared.eventEmitter sendCallStateEventWith:@"Idle"];
  }];
}

RCT_EXPORT_METHOD(enableNoiseSuppression)
{
  [self.client enableNoiseSuppression:ClientManager.shared.callId
                             callback:^(NSError * _Nullable error) {
    if (error != nil) {
      NSLog(@"Error enabling noise suppression on Call: %@", error);
    } else {
      NSLog(@"Enabled noise suppression on Call with id: %@", ClientManager.shared.callId);
    }
  }];
}

RCT_EXPORT_METHOD(setMuted:(BOOL)domute) {
  if (!ClientManager.shared.callId) {
    return;
  }

  if (domute) {
    NSLog(@"set muted: %@", ClientManager.shared.callId);
    [ClientManager.shared.client mute:ClientManager.shared.callId
                             callback:^(NSError * _Nullable error) {
      if (error != nil) {
        NSLog(@"setMuted error calling mute: %@", error);
        return;
      }
      self.isMutedInternal = true;
    }];
  }
  else {
    NSLog(@"set unmuted: %@", ClientManager.shared.callId);
    [ClientManager.shared.client unmute:ClientManager.shared.callId
                               callback:^(NSError * _Nullable error) {
      if (error != nil) {
        NSLog(@"setMuted error calling unmute: %@", error);
        return;
      }
      self.isMutedInternal = false;
    }];
  }
  
}

RCT_EXPORT_METHOD(isCallMuted:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  resolve(@(self.isMutedInternal));
}


@end
